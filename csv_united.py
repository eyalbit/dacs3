"""
DACS-3.0 Options Analysis System

This script processes options chain CSV files and performs DACS-3.0 strategy analysis
using Google's Gemini AI with custom trading instructions.

USAGE:
    python csv_united.py                 # Full analysis (merge + Gemini + HTML + email)
    python csv_united.py --merge-only    # Only merge CSV files (no Gemini analysis)

CONFIGURATION:
    Edit the variables below to customize behavior:
    - DEFAULT_ASSET: Which asset to analyze (bac, iwm, jpm, spy)
    - DELTA_MIN/MAX: Delta range for filtering CALL options
    - AUTO_SEND_EMAIL: Enable/disable automatic email sending

REQUIREMENTS:
    - .env file with GEMINI_API_KEY (and optionally GMAIL_USER/GMAIL_PASSWORD)
    - CSV files in assets/{asset}/ folder
    - Agent instruction documents in agent-docs/ folder
"""

import csv
import io
import json
import os
import urllib.request
import urllib.error
import time
import mimetypes
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


# =============================================================================
# CONFIGURATION - Edit these values to change default behavior
# =============================================================================

# ===== Folder Paths =====
DEFAULT_ASSET = 'bac'     # Default asset (bac, iwm, jpm, spy, etc.)

BASE_ASSETS_FOLDER = 'assets'        # Base folder containing all asset folders
AGENT_DOCS_FOLDER = 'agent-docs'     # Folder containing instruction documents

# ===== Email Configuration =====
EMAIL_TO = 'eb.bitan@gmail.com'      # Email address to send reports to
AUTO_SEND_EMAIL = True               # Automatically send email with HTML report (True/False)

# ===== Options Filtering Rules (used by Python code) =====
DELTA_MIN = 0.07                     # Minimum Delta for CALL options (used in _filter_rows)
DELTA_MAX = 0.21                     # Maximum Delta for CALL options (used in _filter_rows)
MIN_OPEN_INTEREST = 500              # Minimum Open Interest threshold (for future use)
MIN_DTE_DAYS_SHORT_LEG = 3           # Minimum Days To Expiration for Short Leg (DACS-3.0 rule)
                                     # Filter out expirations < 3 days since they cannot be used as Short Leg

# ===== CSV Column Configuration =====
# Column indices in the original CSV (before Expected Move insertion)
COL_EXPIRATION_DATE = 0
COL_CALL_BID = 4
COL_CALL_ASK = 5
COL_CALL_DELTA = 8
COL_STRIKE = 11
COL_PUT_BID = 15
COL_PUT_ASK = 16
COL_PUT_COLUMNS_START = 12          # First column index to remove (PUT data starts here)
COL_PUT_COLUMNS_END = 21             # Last column index to remove (PUT data ends here)
COL_EXPECTED_MOVE_INSERT_POS = 1     # Position to insert Expected Move column (after Expiration Date)

# ===== Gemini API Configuration =====
GEMINI_DEFAULT_MODEL = 'gemini-flash-lite-latest'
GEMINI_TIMEOUT_SECONDS = 180
GEMINI_CSV_MAX_CHARS = 30000         # Max characters for CSV content in non-Gem mode

# Derived paths - DO NOT EDIT
DEFAULT_FOLDER = os.path.join(BASE_ASSETS_FOLDER, DEFAULT_ASSET)
GEMINI_FILES_CACHE = os.path.join(AGENT_DOCS_FOLDER, '.gemini_files_cache.json')


def _load_env():
    """Load environment variables from .env file if it exists."""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip())


# Load .env on module import
_load_env()


def _parse_float(value):
    if value is None:
        return None
    try:
        return float(str(value).replace(',', '').strip())
    except (TypeError, ValueError):
        return None


def _extract_current_price(lines):
    for line in lines[:3]:
        if isinstance(line, list):
            cells = line
        else:
            cells = [line]
        for cell in cells:
            if 'Last:' in cell:
                try:
                    return float(cell.split(':', 1)[1].strip())
                except ValueError:
                    return None
    return None


def _parse_expiration_date(exp_date_str):
    """
    Parse expiration date string and return datetime object.
    Expected format: 'Fri Jul 31 2026' or similar CBOE format.
    """
    from datetime import datetime

    if not exp_date_str or not isinstance(exp_date_str, str):
        return None

    try:
        # Try parsing format like 'Fri Jul 31 2026'
        exp_date_str = exp_date_str.strip()
        # Remove day of week if present
        parts = exp_date_str.split()
        if len(parts) >= 4:
            # Format: 'Fri Jul 31 2026'
            date_str = ' '.join(parts[1:])  # 'Jul 31 2026'
            return datetime.strptime(date_str, '%b %d %Y')
        elif len(parts) == 3:
            # Format: 'Jul 31 2026'
            return datetime.strptime(exp_date_str, '%b %d %Y')
    except (ValueError, IndexError):
        pass

    return None


def _calculate_dte(exp_date_str):
    """
    Calculate Days To Expiration from expiration date string.
    Returns number of days from today to expiration date.
    """
    from datetime import datetime

    exp_date = _parse_expiration_date(exp_date_str)
    if exp_date is None:
        return None

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    dte = (exp_date - today).days
    return dte


def _load_csv_rows(file_path):
    with open(file_path, 'r', encoding='utf-8', newline='') as handle:
        rows = [row for row in csv.reader(handle) if row and any(cell.strip() for cell in row)]

    if len(rows) < 3:
        return rows[:1], []

    header_rows = rows[:3]

    # Clean header row (3rd row) - remove PUT columns (keep only columns 0 to COL_PUT_COLUMNS_START-1)
    # Add "Expected Move" column after "Expiration Date"
    if len(header_rows) == 3 and len(header_rows[2]) > COL_PUT_COLUMNS_START:
        header_row = header_rows[2][:COL_PUT_COLUMNS_START]
        # Insert "Expected Move" at position COL_EXPECTED_MOVE_INSERT_POS
        header_row.insert(COL_EXPECTED_MOVE_INSERT_POS, 'Expected Move')
        header_rows[2] = header_row

    return header_rows, rows[3:]


def _calculate_expected_move(rows, current_price):
    """Calculate Expected Move from ATM straddle for each expiration date."""
    if current_price is None:
        return None

    # Find ATM strike (closest to current price)
    atm_row = min(rows, key=lambda row: abs(_parse_float(row[COL_STRIKE]) - current_price) if _parse_float(row[COL_STRIKE]) is not None else float('inf'))

    if len(atm_row) <= 19:
        return None

    # Get ATM Call and Put prices (using Mid price: (Bid + Ask) / 2)
    call_bid = _parse_float(atm_row[COL_CALL_BID])
    call_ask = _parse_float(atm_row[COL_CALL_ASK])
    put_bid = _parse_float(atm_row[COL_PUT_BID])
    put_ask = _parse_float(atm_row[COL_PUT_ASK])

    if None in [call_bid, call_ask, put_bid, put_ask]:
        return None

    call_mid = (call_bid + call_ask) / 2
    put_mid = (put_bid + put_ask) / 2
    straddle_price = call_mid + put_mid

    return straddle_price


def _filter_rows(rows, current_price=None):
    grouped_rows = {}
    exp_dates = []
    for row in rows:
        if not row:
            continue
        exp_date = row[COL_EXPIRATION_DATE].strip() if len(row) > COL_EXPIRATION_DATE else ''
        if exp_date not in grouped_rows:
            grouped_rows[exp_date] = []
            exp_dates.append(exp_date)
        grouped_rows[exp_date].append(row)

    filtered_rows = []
    for exp_date in exp_dates:
        exp_rows = grouped_rows[exp_date]

        # Check DTE (Days To Expiration) - filter out expirations that are too soon for Short Leg
        # We only filter out DTE < MIN_DTE_DAYS_SHORT_LEG (too soon to be a Short Leg)
        # We keep longer DTE dates since they can be used as Long Leg (+7 days from Short)
        dte = _calculate_dte(exp_date)
        if dte is not None and dte < MIN_DTE_DAYS_SHORT_LEG:
            # Skip this expiration date - it's too soon (cannot be used as Short Leg)
            print(f'  [FILTERED] Skipping {exp_date} (DTE={dte} days, minimum required: {MIN_DTE_DAYS_SHORT_LEG} days)')
            continue

        # Calculate Expected Move for this expiration
        expected_move = _calculate_expected_move(exp_rows, current_price) if current_price is not None else None

        exp_filtered = []
        for row in exp_rows:
            if len(row) <= 19:
                continue

            call_delta = _parse_float(row[COL_CALL_DELTA])

            # Only keep CALL side rows with delta between DELTA_MIN and DELTA_MAX
            # Remove rows with delta above DELTA_MAX (including high-delta ATM rows)
            call_cond = call_delta is not None and DELTA_MIN <= call_delta <= DELTA_MAX

            if call_cond:
                # Remove PUT columns (COL_PUT_COLUMNS_START onwards)
                # Keep only: Expiration Date (0), Calls info (1-11), Strike (11)
                call_only_row = row[:COL_PUT_COLUMNS_START]

                # Insert Expected Move as second column (after Expiration Date)
                expected_move_str = f'${expected_move:.2f}' if expected_move is not None else ''
                call_only_row.insert(COL_EXPECTED_MOVE_INSERT_POS, expected_move_str)

                exp_filtered.append(call_only_row)

        if exp_filtered:
            # Sort by strike (now at index COL_PUT_COLUMNS_START due to Expected Move column insertion)
            strike_idx = COL_PUT_COLUMNS_START
            exp_filtered = sorted(exp_filtered, key=lambda row: (_parse_float(row[strike_idx]) is None, _parse_float(row[strike_idx]) or 0))
            filtered_rows.extend(exp_filtered)

    return filtered_rows


def build_filtered_csv_text(folder=DEFAULT_FOLDER):
    files = _list_csv_files(folder)
    if not files:
        raise FileNotFoundError(f'No CSV files found in folder: {folder}')

    output = io.StringIO()
    writer = csv.writer(output)

    for idx, file in enumerate(files):
        file_path = os.path.join(folder, file)
        stock_lines, data_rows = _load_csv_rows(file_path)
        current_price = _extract_current_price(stock_lines)
        filtered_rows = _filter_rows(data_rows, current_price=current_price)

        if idx > 0:
            writer.writerow([])
            writer.writerow([])
            writer.writerow([])

        for stock_line in stock_lines:
            writer.writerow(stock_line)

        for row in filtered_rows:
            writer.writerow(row)

    return output.getvalue()


def process_csv_folder(folder=DEFAULT_FOLDER):
    files = _list_csv_files(folder)
    if not files:
        raise FileNotFoundError(f'No CSV files found in folder: {folder}')

    output_rows = []

    for idx, file in enumerate(files):
        file_path = os.path.join(folder, file)
        stock_lines, data_rows = _load_csv_rows(file_path)
        current_price = _extract_current_price(stock_lines)
        filtered_rows = _filter_rows(data_rows, current_price=current_price)

        output_rows.append([f'Source File: {file}'])

        if idx > 0:
            output_rows.extend([[]] * 3)

        for stock_line in stock_lines:
            output_rows.append(stock_line)

        for row in filtered_rows:
            output_rows.append(row)

    output_path = os.path.join(folder, 'merged_filtered_options.csv')
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as handle:
            writer = csv.writer(handle)
            writer.writerows(output_rows)
    except PermissionError:
        fallback_path = os.path.join(os.getcwd(), 'merged_filtered_options.csv')
        with open(fallback_path, 'w', newline='', encoding='utf-8') as handle:
            writer = csv.writer(handle)
            writer.writerows(output_rows)
        output_path = fallback_path
        print(f"Warning: could not write to '{os.path.join(folder, 'merged_filtered_options.csv')}', wrote to '{output_path}' instead.")

    return output_path


def _list_csv_files(folder):
    if not os.path.isdir(folder):
        raise FileNotFoundError(f'Folder not found: {folder}')

    return sorted(
        name for name in os.listdir(folder)
        if name.lower().endswith('.csv') and name != 'merged_filtered_options.csv'
    )


def _load_gemini_files_cache():
    """Load cached Gemini file URIs from disk."""
    if os.path.exists(GEMINI_FILES_CACHE):
        try:
            with open(GEMINI_FILES_CACHE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_gemini_files_cache(cache):
    """Save Gemini file URIs to disk."""
    os.makedirs(os.path.dirname(GEMINI_FILES_CACHE), exist_ok=True)
    with open(GEMINI_FILES_CACHE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2)


def _upload_file_to_gemini(file_path, api_key, display_name=None):
    """Upload a file to Gemini File API and return the file URI."""
    if display_name is None:
        display_name = os.path.basename(file_path)

    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        if file_path.endswith('.docx'):
            mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_path.endswith('.txt'):
            mime_type = 'text/plain'
        elif file_path.endswith('.csv'):
            mime_type = 'text/csv'
        else:
            mime_type = 'application/octet-stream'

    # Step 1: Request upload URL
    upload_url = f'https://generativelanguage.googleapis.com/upload/v1beta/files?key={api_key}'
    metadata = {
        'file': {
            'display_name': display_name
        }
    }

    headers = {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': str(os.path.getsize(file_path)),
        'X-Goog-Upload-Header-Content-Type': mime_type,
        'Content-Type': 'application/json',
    }

    request_data = json.dumps(metadata).encode('utf-8')
    req = urllib.request.Request(upload_url, data=request_data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            upload_location = response.headers.get('X-Goog-Upload-URL')
            if not upload_location:
                raise RuntimeError('No upload URL received from Gemini')
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'Failed to initialize upload: {exc.code} - {error_text}') from exc

    # Step 2: Upload file content
    with open(file_path, 'rb') as f:
        file_data = f.read()

    upload_headers = {
        'Content-Length': str(len(file_data)),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
    }

    upload_req = urllib.request.Request(upload_location, data=file_data, headers=upload_headers, method='POST')

    try:
        with urllib.request.urlopen(upload_req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            file_uri = result['file']['uri']

            # Wait for file to be processed
            max_wait = 30
            for _ in range(max_wait):
                state = _get_file_state(file_uri, api_key)
                if state == 'ACTIVE':
                    return file_uri
                elif state == 'FAILED':
                    raise RuntimeError(f'File processing failed: {file_uri}')
                time.sleep(1)

            raise RuntimeError(f'File processing timeout: {file_uri}')
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'Failed to upload file: {exc.code} - {error_text}') from exc


def _get_file_state(file_uri, api_key):
    """Get the processing state of an uploaded file."""
    file_name = file_uri.split('/')[-1]
    url = f'https://generativelanguage.googleapis.com/v1beta/files/{file_name}?key={api_key}'

    req = urllib.request.Request(url, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('state', 'UNKNOWN')
    except urllib.error.HTTPError:
        return 'UNKNOWN'


def _upload_agent_docs(api_key, force_reupload=False):
    """Upload all agent-docs files to Gemini and return their URIs."""
    cache = _load_gemini_files_cache()

    if not force_reupload and cache:
        print(f'Using cached Gemini files (found {len(cache)} files)')
        return cache

    if not os.path.isdir(AGENT_DOCS_FOLDER):
        raise FileNotFoundError(f'Agent docs folder not found: {AGENT_DOCS_FOLDER}')

    files_to_upload = [
        f for f in os.listdir(AGENT_DOCS_FOLDER)
        if f.endswith(('.docx', '.txt')) and not f.startswith('.')
    ]

    if not files_to_upload:
        raise FileNotFoundError(f'No documents found in {AGENT_DOCS_FOLDER}')

    uploaded_files = {}
    print(f'Uploading {len(files_to_upload)} agent docs to Gemini...')

    for filename in files_to_upload:
        file_path = os.path.join(AGENT_DOCS_FOLDER, filename)
        print(f'  Uploading {filename}...')
        try:
            file_uri = _upload_file_to_gemini(file_path, api_key, display_name=filename)
            uploaded_files[filename] = file_uri
            print(f'    [OK] {filename} -> {file_uri}')
        except Exception as exc:
            print(f'    [FAIL] Failed to upload {filename}: {exc}')
            raise

    _save_gemini_files_cache(uploaded_files)
    print(f'Successfully uploaded {len(uploaded_files)} files')
    return uploaded_files


def _load_system_instructions():
    """Load all instruction files from agent-docs folder."""
    if not os.path.isdir(AGENT_DOCS_FOLDER):
        raise FileNotFoundError(f'Agent docs folder not found: {AGENT_DOCS_FOLDER}')

    # Get all .txt files
    txt_files = sorted([
        f for f in os.listdir(AGENT_DOCS_FOLDER)
        if f.endswith('.txt') and not f.startswith('.')
    ])

    if not txt_files:
        raise FileNotFoundError(f'No .txt instruction files found in {AGENT_DOCS_FOLDER}')

    # Load and combine all instructions
    all_instructions = []
    for filename in txt_files:
        file_path = os.path.join(AGENT_DOCS_FOLDER, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content:
                all_instructions.append(f"### {filename}\n\n{content}")

    combined = "\n\n---\n\n".join(all_instructions)
    return combined


def clear_gemini_cache():
    """Clear the cached Gemini file URIs. Use this if you updated agent-docs files."""
    if os.path.exists(GEMINI_FILES_CACHE):
        os.remove(GEMINI_FILES_CACHE)
        print(f'Cleared Gemini files cache: {GEMINI_FILES_CACHE}')
        return True
    else:
        print('No cache file found')
        return False


def _extract_text_from_result(result):
    """Extract text content from Gemini API response."""
    if 'candidates' in result and result['candidates']:
        for candidate in result['candidates']:
            if 'content' in candidate and 'parts' in candidate['content']:
                for part in candidate['content']['parts']:
                    if 'text' in part:
                        return part['text']
    return None


def _save_result_as_html(result, folder=DEFAULT_FOLDER):
    """Save Gemini result as HTML file in the specified folder."""
    from datetime import datetime

    text_content = _extract_text_from_result(result)
    if not text_content:
        print('No text content found in result')
        return None

    # Generate filename: folder name + DACS-3.0 + timestamp
    folder_name = os.path.basename(os.path.abspath(folder))
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'{folder_name}_DACS-3.0_{timestamp}.html'
    output_path = os.path.join(folder, filename)

    # Create HTML template
    html_content = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DACS 3.0 Analysis - {folder_name}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }}
        .container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        h3 {{
            color: #7f8c8d;
        }}
        .header-info {{
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .timestamp {{
            color: #7f8c8d;
            font-size: 0.9em;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            direction: ltr;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }}
        th {{
            background: #3498db;
            color: white;
        }}
        tr:nth-child(even) {{
            background: #f9f9f9;
        }}
        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }}
        pre {{
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            direction: ltr;
        }}
        .no-setups {{
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            color: #856404;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #7f8c8d;
            font-size: 0.9em;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header-info">
            <h1>📊 DACS 3.0 Options Strategy Analysis</h1>
            <div class="timestamp">
                <strong>תיקייה:</strong> {folder_name}<br>
                <strong>תאריך יצירה:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br>
                <strong>מודל:</strong> Gemini with DACS Instructions
            </div>
        </div>

        <div class="content">
{_markdown_to_html(text_content)}
        </div>

        <div class="footer">
            <p>Generated by DACS 3.0 Analysis System | Powered by Gemini AI</p>
        </div>
    </div>
</body>
</html>"""

    # Save HTML file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f'[OK] HTML report saved: {output_path}')
    return output_path


def _markdown_to_html(text):
    """Simple markdown to HTML converter for the response text."""
    import re

    lines = text.split('\n')
    html_lines = []
    in_code_block = False
    in_table = False

    for line in lines:
        # Code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                html_lines.append('</pre>')
                in_code_block = False
            else:
                html_lines.append('<pre><code>')
                in_code_block = True
            continue

        if in_code_block:
            html_lines.append(line)
            continue

        # Convert markdown links [text](url) to HTML <a href="url">text</a>
        line = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2" target="_blank">\1</a>', line)

        # Headers - extract Fast Ratio if present
        if line.startswith('###'):
            header_text = line[3:].strip()
            # Look for Fast Ratio in the header and make it prominent
            if 'Fast Ratio' in header_text or '%' in header_text:
                # Extract percentage if present
                ratio_match = re.search(r'(\d+\.?\d*)%', header_text)
                if ratio_match:
                    ratio = ratio_match.group(0)
                    header_text = f'{header_text} <span style="color:#27ae60;font-weight:bold;font-size:1.2em;">[{ratio}]</span>'
            html_lines.append(f'<h3>{header_text}</h3>')
        elif line.startswith('##'):
            html_lines.append(f'<h2>{line[2:].strip()}</h2>')
        elif line.startswith('#'):
            html_lines.append(f'<h1>{line[1:].strip()}</h1>')
        # Special messages
        elif 'No valid setups found' in line:
            html_lines.append(f'<div class="no-setups">{line}</div>')
        # Tables (simple detection)
        elif '|' in line and not in_table:
            in_table = True
            html_lines.append('<table>')
            cells = [c.strip() for c in line.split('|') if c.strip()]
            html_lines.append('<tr>' + ''.join(f'<th>{c}</th>' for c in cells) + '</tr>')
        elif in_table and '|' in line:
            if line.strip().startswith('|---'):
                continue
            cells = [c.strip() for c in line.split('|') if c.strip()]
            # Process each cell for links
            processed_cells = []
            for cell in cells:
                # Already processed by regex above
                processed_cells.append(f'<td>{cell}</td>')
            html_lines.append('<tr>' + ''.join(processed_cells) + '</tr>')
        elif in_table and '|' not in line:
            html_lines.append('</table>')
            in_table = False
            html_lines.append(f'<p>{line}</p>')
        # Regular paragraphs
        elif line.strip():
            html_lines.append(f'<p>{line}</p>')
        else:
            html_lines.append('<br>')

    if in_code_block:
        html_lines.append('</code></pre>')
    if in_table:
        html_lines.append('</table>')

    return '\n'.join(html_lines)


def send_email_with_html_report(html_file_path, to_email=EMAIL_TO, from_email=None, smtp_server=None, smtp_port=587, smtp_password=None):
    """
    Send HTML report via email using Gmail SMTP.
    Also attaches all other files (CSV, etc.) from the same folder.

    Args:
        html_file_path: Path to the HTML report file
        to_email: Recipient email address
        from_email: Sender email (defaults to GMAIL_USER from .env)
        smtp_server: SMTP server (defaults to smtp.gmail.com)
        smtp_port: SMTP port (default 587 for TLS)
        smtp_password: Email password/app password (defaults to GMAIL_PASSWORD from .env)

    Returns:
        bool: True if sent successfully, False otherwise
    """
    # Load credentials from environment
    if from_email is None:
        from_email = os.environ.get('GMAIL_USER')
    if smtp_password is None:
        smtp_password = os.environ.get('GMAIL_PASSWORD')
    if smtp_server is None:
        smtp_server = 'smtp.gmail.com'

    # Validate required parameters
    if not from_email or not smtp_password:
        print('[X] Missing email credentials. Set GMAIL_USER and GMAIL_PASSWORD in .env file')
        print('   Example:')
        print('   GMAIL_USER=your-email@gmail.com')
        print('   GMAIL_PASSWORD=your-app-password')
        print('')
        print('   Note: Use Gmail App Password, not your regular password.')
        print('   Generate one at: https://myaccount.google.com/apppasswords')
        return False

    if not os.path.exists(html_file_path):
        print(f'[X] HTML file not found: {html_file_path}')
        return False

    try:
        # Extract asset name and timestamp from filename
        filename = os.path.basename(html_file_path)
        asset_name = filename.split('_')[0].upper()

        # Get the folder containing the HTML file
        asset_folder = os.path.dirname(html_file_path)

        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = f'DACS-3.0 Analysis Report - {asset_name}'

        # Collect all files to attach
        files_to_attach = []
        if os.path.isdir(asset_folder):
            for item in os.listdir(asset_folder):
                item_path = os.path.join(asset_folder, item)
                if os.path.isfile(item_path):
                    files_to_attach.append(item_path)

        # Email body
        body = f"""
DACS-3.0 Options Strategy Analysis Report

Asset: {asset_name}
Report: {filename}

Attached files ({len(files_to_attach)}):
"""
        for f in files_to_attach:
            body += f"  - {os.path.basename(f)}\n"

        body += """
This is an automated report generated by the DACS-3.0 analysis system.
"""
        msg.attach(MIMEText(body, 'plain'))

        # Attach all files from the folder
        print(f'  Attaching {len(files_to_attach)} files...')
        for file_path in files_to_attach:
            file_name = os.path.basename(file_path)
            print(f'    - {file_name}')

            with open(file_path, 'rb') as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())

            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename={file_name}')
            msg.attach(part)

        # Send email - try both ports
        print(f'Sending email to {to_email}...')

        # Try port 587 first (TLS)
        try:
            print('  Trying port 587 (TLS)...')
            server = smtplib.SMTP(smtp_server, 587, timeout=10)
            server.starttls()
            server.login(from_email, smtp_password)
            server.send_message(msg)
            server.quit()
            print(f'[OK] Email sent successfully to {to_email}')
            return True
        except Exception as e1:
            print(f'  Port 587 failed: {e1}')

            # Try port 465 (SSL)
            try:
                print('  Trying port 465 (SSL)...')
                server = smtplib.SMTP_SSL(smtp_server, 465, timeout=10)
                server.login(from_email, smtp_password)
                server.send_message(msg)
                server.quit()
                print(f'[OK] Email sent successfully to {to_email}')
                return True
            except Exception as e2:
                print(f'  Port 465 failed: {e2}')
                raise e2  # Re-raise to be caught by outer except

    except smtplib.SMTPAuthenticationError:
        print('[X] Email authentication failed. Check your GMAIL_USER and GMAIL_PASSWORD.')
        print('   Make sure you are using a Gmail App Password, not your regular password.')
        return False
    except Exception as e:
        print(f'[X] Failed to send email: {e}')
        print('   Check that GMAIL_USER and GMAIL_PASSWORD are set in .env file')
        return False


def send_merged_file_to_gemini(file_path=None, folder=DEFAULT_FOLDER, api_key=None, prompt=None, model=None, allow_retry=True):
    if file_path is None:
        file_path = os.path.join(folder, 'merged_filtered_options.csv')

    if not os.path.exists(file_path):
        file_path = process_csv_folder(folder=folder)

    if api_key is None:
        api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key:
        raise RuntimeError('Missing GEMINI_API_KEY. Set it in your environment or pass api_key explicitly.')

    if model is None:
        model = os.environ.get('GEMINI_MODEL', GEMINI_DEFAULT_MODEL)

    if prompt is None:
        prompt = (
            'Please analyze the following merged CSV file and summarize the most relevant options data. '
            'Highlight important patterns, expiries, and strikes.'
        )

    with open(file_path, 'r', encoding='utf-8') as handle:
        csv_text = handle.read()

    if len(csv_text) > GEMINI_CSV_MAX_CHARS:
        csv_text = csv_text[:GEMINI_CSV_MAX_CHARS]
        prompt = f'{prompt}\nThe CSV content was truncated to fit the API limits.'

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    payload = {
        'contents': [
            {
                'parts': [
                    {'text': prompt},
                    {'text': csv_text},
                ]
            }
        ]
    }

    request_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=request_data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_SECONDS) as response:
            body = response.read().decode('utf-8')
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='ignore')
        if '429' in error_text or 'RESOURCE_EXHAUSTED' in error_text and allow_retry:
            fallback_prompt = 'Summarize this CSV file briefly in one paragraph.'
            return send_merged_file_to_gemini(
                file_path=file_path,
                folder=folder,
                api_key=api_key,
                prompt=fallback_prompt,
                model=model,
                allow_retry=False,
            )
        raise RuntimeError(f'Gemini request failed with status {exc.code}: {error_text}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Gemini request failed: {exc.reason}') from exc


def send_merged_folder_to_gemini(folder=DEFAULT_FOLDER, api_key=None, prompt=None, model=None, allow_retry=True):
    output_path = process_csv_folder(folder=folder)
    return send_merged_file_to_gemini(file_path=output_path, folder=folder, api_key=api_key, prompt=prompt, model=model, allow_retry=allow_retry)


def send_partial_csv_to_gemini(file_path=None, folder=DEFAULT_FOLDER, api_key=None, prompt=None, model=None, max_chars=8000):
    if file_path is None:
        file_path = os.path.join(folder, 'merged_filtered_options.csv')

    if not os.path.exists(file_path):
        file_path = process_csv_folder(folder=folder)

    if api_key is None:
        api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key:
        raise RuntimeError('Missing GEMINI_API_KEY. Set it in your environment or pass api_key explicitly.')

    if model is None:
        model = os.environ.get('GEMINI_MODEL', GEMINI_DEFAULT_MODEL)

    if prompt is None:
        prompt = 'Please analyze this CSV sample and tell me whether the file is readable.'

    with open(file_path, 'r', encoding='utf-8') as handle:
        csv_text = handle.read()

    csv_text = csv_text[:max_chars]
    payload = {
        'contents': [
            {'parts': [{'text': prompt}, {'text': csv_text}]}
        ]
    }

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    request_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=request_data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_SECONDS) as response:
            body = response.read().decode('utf-8')
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'Gemini request failed with status {exc.code}: {error_text}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Gemini request failed: {exc.reason}') from exc


def send_to_gem(file_path=None, folder=DEFAULT_FOLDER, api_key=None, prompt=None, model=None, force_reupload_docs=False):
    """
    Send merged CSV file to Gemini with full DACS Gem configuration.
    This sends the CSV as an uploaded file and includes all agent-docs as inline text.

    Args:
        file_path: Path to the merged CSV file (optional, will be generated if missing)
        folder: Folder containing source CSV files
        api_key: Gemini API key (defaults to GEMINI_API_KEY env var)
        prompt: User prompt (defaults to DACS analysis request)
        model: Model name (defaults to gemini-flash-lite-latest or GEMINI_MODEL env var)
        force_reupload_docs: Not used in this version (docs are sent inline)

    Returns:
        dict: Gemini API response
    """
    if file_path is None:
        file_path = os.path.join(folder, 'merged_filtered_options.csv')

    if not os.path.exists(file_path):
        print(f'Merged file not found, generating from {folder}...')
        file_path = process_csv_folder(folder=folder)

    if api_key is None:
        api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key:
        raise RuntimeError('Missing GEMINI_API_KEY. Set it in your environment or pass api_key explicitly.')

    if model is None:
        model = os.environ.get('GEMINI_MODEL', GEMINI_DEFAULT_MODEL)

    if prompt is None:
        # Get today's date for DTE context
        from datetime import datetime
        today_str = datetime.now().strftime('%B %d, %Y')  # e.g., "July 30, 2026"

        prompt = f'''Analyze the attached CSV file and build DACS-3.0 strategies ONLY.

TODAY'S DATE: {today_str}

CRITICAL DTE VALIDATION (MUST FOLLOW):
- Before selecting any Short Leg, calculate its Days To Expiration (DTE)
- Short Leg DTE MUST be between 3 to 7 days (inclusive)
- REJECT any Short Leg with DTE < 3 or DTE > 7
- Example validation for today ({today_str}):
  * If expiration is tomorrow (DTE=1 or 2): INVALID - too soon
  * If expiration is 3-7 days away: VALID for Short Leg
  * If expiration is 8+ days away: INVALID for Short Leg (but valid for Long Leg)

CRITICAL: Follow ALL rules from the instruction documents exactly, including:
- Short Leg DTE requirements (3-7 days, validated above)
- Delta ranges (normal vs earnings week)
- Open Interest minimums
- Margin targets and limits
- CREDIT/DEBIT rules and maximum thresholds
- All other parameters specified in the Master Instructions

IMPORTANT: For EACH position in the results table, you MUST:
1. Include an OptionStrat link in the "OpenStrat Link" column
2. Add a "Type" column showing DEBIT or CREDIT immediately below the "Fast Ratio" row

OptionStrat URL Construction Rules (CRITICAL - Follow Exactly):
-------------------------------------------------------------
Base URL format:
- For CALL: https://optionstrat.com/build/diagonal-call-spread/<TICKER>/
- For PUT: https://optionstrat.com/build/diagonal-put-spread/<TICKER>/

Leg parameters format: -.ShortLegParams,.LongLegParams
- Each leg: <TICKER><YYMMDD><C/P><STRIKE>
- TICKER: uppercase symbol (e.g., IWM, SPY, BAC)
- YYMMDD: 6-digit date from expiration (e.g., Jul 31 2026 = 260731)
- C/P: C for Call, P for Put
- STRIKE: strike price from the "Strike" column in the CSV (e.g., 65 for BAC, 299 for IWM)
  IMPORTANT: Use the "Strike" column value, NOT the option symbol!
  Example: For BAC260731C00065000, the Strike column shows 65.00, so use 65 in the URL

Syntax rules (MUST follow exactly):
- Short leg: ALWAYS prefix with "-." (minus-dot)
- Long leg: ALWAYS prefix with "." (dot only)
- Separator: comma with NO space between legs

Example for IWM Call diagonal spread:
- Short: IWM Jul 31 2026 Strike 299 Call
- Long: IWM Aug 7 2026 Strike 300 Call
- Correct URL: https://optionstrat.com/build/diagonal-call-spread/IWM/-.IWM260731C299,.IWM260807C300

Output Format Requirements (CRITICAL - Follow EXACTLY):
--------------------------------------------------------
EACH position MUST be presented in a separate Markdown table with these rows:

| Leg / Metric | Date (Expiry) | Type (Call/Put) | Strike | Delta | IV | Bid/Ask | Mid Cost |
|---|---|---|---|---|---|---|---|
| **Short Leg** | MM-DD | Call/Put | XXX | X.XXX | XX.X% | Bid | $X.XX |
| **Long Leg** | MM-DD | Call/Put | XXX | X.XXX | XX.X% | Ask | $X.XX |
| **Position Type** | [Credit / Debit] Value: **$X.XX** | | | | | | |
| **Required Margin** | **$XXX** | | | | | | |
| **Fast Ratio Math** | Formula: `(Mid Long Cost +/- Premium) / Margin` <br> Calculation: `(X.XX +/- X.XX) / X.XX = XX.X%` | | | | | | |
| **Fast Ratio Result** | **XX.X%** | | | | | | |
| **OpenStrat Link** | [Analyze Position on OptionStrat](<full URL>) | | | | | | |

CRITICAL: The "Position Type" row MUST show either "Credit" or "Debit" with the net value

Build at least 3 valid positions (or state if fewer positions meet all criteria).

Present results in Hebrew, but keep technical terms in English.'''

    # Load system instructions
    print('Loading DACS system instructions...')
    system_instructions = _load_system_instructions()

    # Read the CSV content as text
    print(f'Reading merged CSV file: {os.path.basename(file_path)}...')
    with open(file_path, 'r', encoding='utf-8') as f:
        csv_content = f.read()
    print(f'  [OK] CSV loaded ({len(csv_content)} characters)')

    # Build the request payload with system instructions + CSV inline
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'

    # Reference note about knowledge files
    knowledge_note = """
KNOWLEDGE FILES CONTEXT:
The following knowledge documents are available for reference (originally from agent-docs/):
- 01_DACS_GPTS_MASTER_INSTRUCTIONS.txt (included above as system instructions)
- 03_DACS_1_MONTHLY_RULES.docx
- 04_DACS_OUTPUT_PROTOCOL.docx
- 05_OPTIONSTRAT_URL_PROTOCOL.docx
- 06_DACS_INPUT_DATA_CONTRACT.docx

All rules and protocols from these documents must be followed as specified in the Master Instructions above.
"""

    full_prompt = f"""{prompt}

===== CSV DATA =====
{csv_content}
===== END CSV DATA =====
"""

    payload = {
        'system_instruction': {
            'parts': [{'text': system_instructions + '\n\n' + knowledge_note}]
        },
        'contents': [
            {
                'parts': [
                    {'text': full_prompt}
                ]
            }
        ]
    }

    request_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=request_data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    print(f'Sending request to Gemini {model} with system instructions + CSV file...')
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            body = response.read().decode('utf-8')
            result = json.loads(body)
            print('[OK] Response received from Gemini')
            return result
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'Gemini request failed with status {exc.code}: {error_text}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Gemini request failed: {exc.reason}') from exc


def _get_all_asset_folders():
    """Get all folders under BASE_ASSETS_FOLDER that contain CSV files."""
    if not os.path.isdir(BASE_ASSETS_FOLDER):
        raise FileNotFoundError(f'Assets folder not found: {BASE_ASSETS_FOLDER}')

    asset_folders = []
    for item in os.listdir(BASE_ASSETS_FOLDER):
        folder_path = os.path.join(BASE_ASSETS_FOLDER, item)
        if os.path.isdir(folder_path):
            # Check if folder contains CSV files (excluding merged files)
            csv_files = _list_csv_files(folder_path)
            if csv_files:
                asset_folders.append(folder_path)

    return sorted(asset_folders)


def scrape_and_process_all(scrape_first=True, merge_only=False):
    """
    Scrape data from web (optional) then process all assets.

    NOTE: Scraping is now done via TypeScript scraper (scraper-ts/).
    This function expects CSV files to already exist in assets/ folders.

    Args:
        scrape_first: If True, run TypeScript scraper first (default: True)
        merge_only: If True, only merge CSVs without Gemini analysis (default: False)

    Returns:
        dict: Processing results for each asset
    """
    import shutil
    import subprocess

    # STEP 0: Clean assets folder before starting
    print('\n' + '='*80)
    print('STEP 0: CLEANING ASSETS FOLDER')
    print('='*80)

    if os.path.isdir(BASE_ASSETS_FOLDER):
        cleaned_count = 0

        for item in os.listdir(BASE_ASSETS_FOLDER):
            item_path = os.path.join(BASE_ASSETS_FOLDER, item)

            # Skip the 'bac' folder (backup reference)
            if item.lower() == 'bac':
                print(f'[i] Skipping backup folder: {item}')
                continue

            # Delete everything else
            if os.path.isdir(item_path):
                try:
                    shutil.rmtree(item_path)
                    print(f'[OK] Deleted folder: {item}')
                    cleaned_count += 1
                except Exception as exc:
                    print(f'[!] Failed to delete {item}: {exc}')
            elif os.path.isfile(item_path):
                try:
                    os.remove(item_path)
                    print(f'[OK] Deleted file: {item}')
                    cleaned_count += 1
                except Exception as exc:
                    print(f'[!] Failed to delete {item}: {exc}')

        print(f'[OK] Cleaned {cleaned_count} items from assets/')
    else:
        print(f'[i] Assets folder does not exist, creating: {BASE_ASSETS_FOLDER}')
        os.makedirs(BASE_ASSETS_FOLDER, exist_ok=True)

    if scrape_first:
        print('\n' + '='*80)
        print('STEP 1: SCRAPING FRESH DATA')
        print('='*80)

        try:
            scraper_dir = os.path.join(os.path.dirname(__file__), 'scraper-ts')

            if os.path.isdir(scraper_dir):
                print('[i] Running Barchart Screener...')
                result = subprocess.run(
                    ['npm', 'run', 'screener'],
                    cwd=scraper_dir,
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    print('[OK] TypeScript scraper completed successfully')
                else:
                    print(f'[!] TypeScript scraper failed: {result.stderr}')
                    print('[i] Processing will use existing CSV files.')
            else:
                print('[!] TypeScript scraper not found at: scraper-ts/')
                print('[i] To use scraper: cd scraper-ts && npm install && npm run build')
                print('[i] Processing will use existing CSV files.')

        except FileNotFoundError:
            print('[!] npm not found. Install Node.js to use TypeScript scraper.')
            print('[i] Processing will use existing CSV files.')
        except Exception as exc:
            print(f'[!] Scraping failed: {exc}')
            print('[i] Processing will use existing CSV files.')

    print('\n' + '='*80)
    print('STEP 2: PROCESSING ASSETS')
    print('='*80)

    return process_all_assets(merge_only=merge_only)


def process_all_assets(merge_only=False):
    """Process all asset folders: merge CSVs, run Gemini analysis, create HTML, send email."""
    asset_folders = _get_all_asset_folders()

    if not asset_folders:
        print(f'[X] No asset folders with CSV files found in {BASE_ASSETS_FOLDER}')
        return

    print(f'\n[i] Found {len(asset_folders)} asset folders to process:')
    for folder in asset_folders:
        print(f'    - {os.path.basename(folder)}')

    results = []

    for idx, folder in enumerate(asset_folders, 1):
        asset_name = os.path.basename(folder)
        print(f'\n{"="*80}')
        print(f'Processing asset {idx}/{len(asset_folders)}: {asset_name.upper()}')
        print(f'{"="*80}')

        try:
            # Step 1: Merge CSV files
            print(f'\n=== Step 1: Merging CSV files for {asset_name} ===')
            output_path = process_csv_folder(folder=folder)
            print(f'[OK] Merged CSV created: {output_path}')

            if merge_only:
                results.append({'asset': asset_name, 'status': 'merged', 'path': output_path})
                continue

            # Step 2: Run Gemini analysis
            print(f'\n=== Step 2: Running DACS Analysis with Gemini for {asset_name} ===')
            result = send_to_gem(file_path=output_path, folder=folder)

            # Step 3: Save result as HTML
            html_path = _save_result_as_html(result, folder=folder)
            if html_path:
                print(f'\n[OK] HTML report created: {html_path}')

                # Step 4: Send email (if AUTO_SEND_EMAIL is enabled)
                email_sent = False
                if AUTO_SEND_EMAIL:
                    print(f'\n=== Sending Email for {asset_name} ===')
                    email_sent = send_email_with_html_report(html_path)
                    if not email_sent:
                        print('[!] Email not sent - check your .env file for GMAIL_USER and GMAIL_PASSWORD')
                else:
                    print('[i] Email sending disabled (AUTO_SEND_EMAIL=False)')

                results.append({
                    'asset': asset_name,
                    'status': 'completed',
                    'merged_csv': output_path,
                    'html_report': html_path,
                    'email_sent': email_sent
                })
            else:
                results.append({
                    'asset': asset_name,
                    'status': 'failed',
                    'error': 'Failed to create HTML report'
                })

        except Exception as exc:
            print(f'\n[X] Error processing {asset_name}: {exc}')
            import traceback
            traceback.print_exc()
            results.append({
                'asset': asset_name,
                'status': 'error',
                'error': str(exc)
            })
            continue

    # Summary
    print(f'\n{"="*80}')
    print('PROCESSING SUMMARY')
    print(f'{"="*80}')
    for result in results:
        status_icon = '[OK]' if result['status'] in ['merged', 'completed'] else '[X]'
        print(f'{status_icon} {result["asset"].upper()}: {result["status"]}')
        if result['status'] == 'completed':
            print(f'    - HTML: {os.path.basename(result["html_report"])}')
            if result.get('email_sent'):
                print(f'    - Email: Sent')
        elif result['status'] == 'error':
            print(f'    - Error: {result.get("error", "Unknown error")}')

    return results


if __name__ == '__main__':
    import sys

    # Command line arguments:
    # --merge-only: Skip Gemini analysis, only merge CSV files
    # --no-scrape: Skip scraping, use existing CSV files
    # --scrape-only: Only scrape data (TypeScript), don't process
    merge_only = '--merge-only' in sys.argv
    no_scrape = '--no-scrape' in sys.argv
    scrape_only = '--scrape-only' in sys.argv

    try:
        if scrape_only:
            # Only scrape with TypeScript, don't process
            print('\n' + '='*80)
            print('SCRAPE-ONLY MODE (TypeScript)')
            print('='*80)

            import subprocess
            import os

            scraper_dir = os.path.join(os.path.dirname(__file__), 'scraper-ts')

            if os.path.isdir(scraper_dir):
                result = subprocess.run(
                    ['npm', 'run', 'scrape', '--', '--all'],
                    cwd=scraper_dir
                )

                if result.returncode == 0:
                    print('\n[OK] Scraping completed')
                else:
                    print('\n[X] Scraping failed')
                    sys.exit(1)
            else:
                print('[X] TypeScript scraper not found at: scraper-ts/')
                print('    Install: cd scraper-ts && npm install && npm run build')
                sys.exit(1)

        elif no_scrape:
            # Process existing files without scraping
            results = process_all_assets(merge_only=merge_only)

            if merge_only:
                print('\n[i] Merge-only mode completed (run without --merge-only for full DACS analysis)')
            else:
                print('\n[i] All assets processed successfully')

        else:
            # Default: Scrape fresh data (TypeScript), then process
            results = scrape_and_process_all(scrape_first=True, merge_only=merge_only)

            if merge_only:
                print('\n[i] Scrape and merge completed (run without --merge-only for full DACS analysis)')
            else:
                print('\n[i] All assets scraped and processed successfully')

    except Exception as exc:
        print(f'\n[X] Fatal error: {exc}')
        import traceback
        traceback.print_exc()
        sys.exit(1)