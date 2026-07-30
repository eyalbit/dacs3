"""
Simple CSV merger - creates merged_filtered_options.csv for each asset folder.
No Gemini analysis, just merge and filter.

Usage:
    python merge_csv.py
"""

import csv
import os
import io


# Configuration
BASE_ASSETS_FOLDER = 'assets'
DELTA_MIN = 0.07
DELTA_MAX = 0.21

# Column indices
COL_EXPIRATION_DATE = 0
COL_CALL_BID = 4
COL_CALL_ASK = 5
COL_CALL_DELTA = 8
COL_STRIKE = 11
COL_PUT_BID = 15
COL_PUT_ASK = 16
COL_PUT_COLUMNS_START = 12
COL_EXPECTED_MOVE_INSERT_POS = 1


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


def _load_csv_rows(file_path):
    with open(file_path, 'r', encoding='utf-8', newline='') as handle:
        rows = [row for row in csv.reader(handle) if row and any(cell.strip() for cell in row)]

    if len(rows) < 3:
        return rows[:1], []

    header_rows = rows[:3]

    # Clean header row - remove PUT columns, add "Expected Move"
    if len(header_rows) == 3 and len(header_rows[2]) > COL_PUT_COLUMNS_START:
        header_row = header_rows[2][:COL_PUT_COLUMNS_START]
        header_row.insert(COL_EXPECTED_MOVE_INSERT_POS, 'Expected Move')
        header_rows[2] = header_row

    return header_rows, rows[3:]


def _calculate_expected_move(rows, current_price):
    """Calculate Expected Move from ATM straddle."""
    if current_price is None:
        return None

    # Find ATM strike
    atm_row = min(rows, key=lambda row: abs(_parse_float(row[COL_STRIKE]) - current_price) if _parse_float(row[COL_STRIKE]) is not None else float('inf'))

    if len(atm_row) <= 19:
        return None

    # Get ATM Call and Put prices
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

        # Calculate Expected Move
        expected_move = _calculate_expected_move(exp_rows, current_price) if current_price is not None else None

        exp_filtered = []
        for row in exp_rows:
            if len(row) <= 19:
                continue

            call_delta = _parse_float(row[COL_CALL_DELTA])

            # Filter by delta range
            if call_delta is not None and DELTA_MIN <= call_delta <= DELTA_MAX:
                # Remove PUT columns
                call_only_row = row[:COL_PUT_COLUMNS_START]

                # Insert Expected Move
                expected_move_str = f'${expected_move:.2f}' if expected_move is not None else ''
                call_only_row.insert(COL_EXPECTED_MOVE_INSERT_POS, expected_move_str)

                exp_filtered.append(call_only_row)

        if exp_filtered:
            # Sort by strike
            strike_idx = COL_PUT_COLUMNS_START
            exp_filtered = sorted(exp_filtered, key=lambda row: (_parse_float(row[strike_idx]) is None, _parse_float(row[strike_idx]) or 0))
            filtered_rows.extend(exp_filtered)

    return filtered_rows


def _list_csv_files(folder):
    if not os.path.isdir(folder):
        return []

    return sorted(
        name for name in os.listdir(folder)
        if name.lower().endswith('.csv') and name != 'merged_filtered_options.csv'
    )


def process_folder(folder):
    """Process a single asset folder."""
    files = _list_csv_files(folder)
    if not files:
        return None

    output_rows = []

    for idx, file in enumerate(files):
        file_path = os.path.join(folder, file)
        print(f'  Processing: {file}')

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

        print(f'    Found {len(filtered_rows)} options (Delta {DELTA_MIN}-{DELTA_MAX})')

    # Save merged file
    output_path = os.path.join(folder, 'merged_filtered_options.csv')
    with open(output_path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerows(output_rows)

    return output_path


def main():
    """Process all asset folders."""
    if not os.path.isdir(BASE_ASSETS_FOLDER):
        print(f'[X] Assets folder not found: {BASE_ASSETS_FOLDER}')
        return

    # Find all asset folders
    asset_folders = []
    for item in os.listdir(BASE_ASSETS_FOLDER):
        folder_path = os.path.join(BASE_ASSETS_FOLDER, item)
        if os.path.isdir(folder_path):
            csv_files = _list_csv_files(folder_path)
            if csv_files:
                asset_folders.append((item, folder_path))

    if not asset_folders:
        print('[X] No asset folders with CSV files found')
        return

    print(f'\n{"="*60}')
    print(f'CSV MERGER - Found {len(asset_folders)} assets')
    print(f'{"="*60}\n')

    results = []
    for asset_name, folder_path in asset_folders:
        print(f'[{asset_name.upper()}]')
        output_path = process_folder(folder_path)

        if output_path:
            print(f'  ✓ Merged CSV: {os.path.basename(output_path)}\n')
            results.append((asset_name, output_path))
        else:
            print(f'  ✗ No CSV files found\n')

    # Summary
    print(f'{"="*60}')
    print('SUMMARY')
    print(f'{"="*60}')
    for asset_name, output_path in results:
        print(f'✓ {asset_name.upper()}: {output_path}')

    print(f'\nTotal: {len(results)}/{len(asset_folders)} assets processed')


if __name__ == '__main__':
    main()
