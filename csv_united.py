import csv
import io
import os
import pandas as pd
import requests

# Example helper for sending a file and instructions to a Gemini agent.
# Do NOT hardcode API keys in source code. Use environment variables instead.
# The provided agent URL is: https://gemini.google.com/gem/a2c49d4d67e1
# The agent ID is likely: a2c49d4d67e1

# def send_to_gemini_agent(agent_id, api_key, file_path, instructions, base_url=None):
#     if base_url is None:
#         base_url = 'https://gemini.googleapis.com/v1'

#     url = f"{base_url}/agents/{agent_id}:run"
#     headers = {
#         'Authorization': f'Bearer {api_key}',
#     }

#     with open(file_path, 'rb') as f:
#         files = {
#             'file': (os.path.basename(file_path), f, 'text/csv'),
#         }
#         data = {
#             'instructions': instructions,
#         }
#         response = requests.post(url, headers=headers, files=files, data=data, timeout=120)

#     response.raise_for_status()
#     return response.json()


# def send_to_gemini_interaction(agent_id, api_key, file_path, instructions, base_agent='antigravity-preview-05-2026', system_instruction='Use the CSV data below and answer based on its content.'):
#     with open(file_path, 'r', encoding='utf-8') as f:
#         csv_text = f.read()

#     payload = {
#         'id': agent_id,
#         'base_agent': base_agent,
#         'system_instruction': system_instruction,
#         'input': [
#             {
#                 'role': 'user',
#                 'content': [
#                     {'type': 'text', 'text': instructions},
#                     {'type': 'text', 'text': csv_text},
#                 ],
#             }
#         ],
#     }

#     headers = {
#         'Content-Type': 'application/json',
#         'x-goog-api-key': api_key,
#     }

#     response = requests.post(
#         'https://generativelanguage.googleapis.com/v1beta/interactions',
#         headers=headers,
#         json=payload,
#         timeout=120,
#     )

#     response.raise_for_status()
#     return response.json()


# def send_to_gemini_csv_text(agent_id, api_key, csv_text, instructions, base_agent='antigravity-preview-05-2026', system_instruction='Use the CSV data below and answer based on its content.'):
#     payload = {
#         'id': agent_id,
#         'base_agent': base_agent,
#         'system_instruction': system_instruction,
#         'input': [
#             {
#                 'role': 'user',
#                 'content': [
#                     {'type': 'text', 'text': instructions},
#                     {'type': 'text', 'text': csv_text},
#                 ],
#             }
#         ],
#     }

#     headers = {
#         'Content-Type': 'application/json',
#         'x-goog-api-key': api_key,
#     }

#     response = requests.post(
#         'https://generativelanguage.googleapis.com/v1beta/interactions',
#         headers=headers,
#         json=payload,
#         timeout=120,
#     )

#     response.raise_for_status()
#     return response.json()


def build_filtered_csv_text(folder='bac'):
    all_files = sorted(os.listdir(folder))
    files = [f for f in all_files if f.lower().endswith('.csv') and f != 'merged_filtered_options.csv']

    if not files:
        raise FileNotFoundError(f'No CSV files found in folder: {folder}')

    output = io.StringIO()
    writer = csv.writer(output)
    total_calls_kept = 0
    total_puts_kept = 0

    for idx, file in enumerate(files):
        file_path = os.path.join(folder, file)

        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.rstrip('\n') for line in f.readlines()]

        current_price = None
        for line in lines[:3]:
            if 'Last:' in line:
                parts = line.split(',')
                for p in parts:
                    if 'Last:' in p:
                        try:
                            current_price = float(p.split(':')[1].strip())
                        except ValueError:
                            pass
                        break

        stock_lines = []
        for line in lines:
            if line.strip():
                stock_lines.append(line)
                if len(stock_lines) == 3:
                    break

        df = pd.read_csv(file_path, skiprows=3)

        df_filtered_list = []
        for exp_date in df['Expiration Date'].unique():
            df_exp = df[df['Expiration Date'] == exp_date].copy()
            if current_price is not None:
                atm_idx = (df_exp['Strike'] - current_price).abs().idxmin()
            else:
                atm_idx = (df_exp['Delta'].astype(float) - 0.5).abs().idxmin()

            call_cond = (df_exp['Delta'] >= 0.07) & (df_exp['Delta'] <= 0.21)
            put_cond = (df_exp['Delta.1'] >= -0.21) & (df_exp['Delta.1'] <= -0.07)
            atm_cond = (df_exp.index == atm_idx)

            df_exp_kept = df_exp[call_cond | put_cond | atm_cond].copy()
            df_filtered_list.append(df_exp_kept)

            total_calls_kept += call_cond.sum() + (~call_cond & atm_cond).sum()
            total_puts_kept += put_cond.sum() + (~put_cond & atm_cond).sum()

        if df_filtered_list:
            df_filtered = pd.concat(df_filtered_list)
        else:
            df_filtered = pd.DataFrame(columns=df.columns)

        df_filtered['Exp_Date_Parsed'] = pd.to_datetime(df_filtered['Expiration Date'])
        df_filtered = df_filtered.sort_values(by=['Exp_Date_Parsed', 'Strike'], ascending=[True, True])
        df_filtered = df_filtered.drop(columns=['Exp_Date_Parsed'])

        if idx > 0:
            writer.writerow([])
            writer.writerow([])
            writer.writerow([])

        for stock_line in stock_lines:
            writer.writerow(next(csv.reader([stock_line])))

        for row in df_filtered.itertuples(index=False, name=None):
            writer.writerow(list(row))

    return output.getvalue()


# דוגמה לשימוש:
# api_key = os.environ['GEMINI_API_KEY']
# agent_id = os.environ['GEMINI_AGENT_ID']
# csv_text = build_filtered_csv_text(folder='bac')
# result = send_to_gemini_csv_text(
#     agent_id=agent_id,
#     api_key=api_key,
#     csv_text=csv_text,
#     instructions='אנא נתח את קובץ ה-CSV והכן סיכום של האופציות הרלוונטיות.'
# )
# print(result)


def process_csv_folder(folder='bac'):
    # קבלת כל קבצי ה-CSV בתיקייה, ללא תלות בשם הקובץ
    all_files = sorted(os.listdir(folder))
    files = [f for f in all_files if f.lower().endswith('.csv') and f != 'merged_filtered_options.csv']

    if not files:
        raise FileNotFoundError(f'No CSV files found in folder: {folder}')

    output_rows = []
    total_calls_kept = 0
    total_puts_kept = 0
    unique_exp_dates = set()

    for idx, file in enumerate(files):
        file_path = os.path.join(folder, file)

        # קריאת מטא-דאטה לשליפת מחיר המניה הנוכחי
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.rstrip('\n') for line in f.readlines()]

        current_price = None
        for line in lines[:3]:
            if 'Last:' in line:
                parts = line.split(',')
                for p in parts:
                    if 'Last:' in p:
                        try:
                            current_price = float(p.split(':')[1].strip())
                        except ValueError:
                            pass
                        break

        # שליפת 3 השורות הראשונות עם נתוני המניה (ללא שורות ריקות)
        stock_lines = []
        for line in lines:
            if line.strip():
                stock_lines.append(line)
                if len(stock_lines) == 3:
                    break

        # קריאת הנתונים החל משורה 4 (אינדקס 3) תוך שמירה על העמודות המקוריות
        df = pd.read_csv(file_path, skiprows=3)

        unique_exp_dates.update(df['Expiration Date'].unique())

        df_filtered_list = []

        for exp_date in df['Expiration Date'].unique():
            df_exp = df[df['Expiration Date'] == exp_date].copy()

            # זיהוי שורת ATM לפי המרחק בין מחיר המימוש (Strike) למחיר המניה הנוכחי, או לפי דלתא Call קרובה ל-0.5
            if current_price is not None:
                atm_idx = (df_exp['Strike'] - current_price).abs().idxmin()
            else:
                atm_idx = (df_exp['Delta'].astype(float) - 0.5).abs().idxmin()

            # תנאי סינון אופציות Call (בין 0.07 ל-0.21)
            call_cond = (df_exp['Delta'] >= 0.07) & (df_exp['Delta'] <= 0.21)
            # תנאי סינון אופציות Put (בין -0.21 ל--0.07)
            put_cond = (df_exp['Delta.1'] >= -0.21) & (df_exp['Delta.1'] <= -0.07)

            # שמירת שורת ה-ATM בכל מקרה
            atm_cond = (df_exp.index == atm_idx)

            # סינון השורות
            df_exp_kept = df_exp[call_cond | put_cond | atm_cond].copy()
            df_filtered_list.append(df_exp_kept)

            total_calls_kept += call_cond.sum() + (~call_cond & atm_cond).sum()
            total_puts_kept += put_cond.sum() + (~put_cond & atm_cond).sum()

        if df_filtered_list:
            df_filtered = pd.concat(df_filtered_list)
        else:
            df_filtered = pd.DataFrame(columns=df.columns)

        # המרה לתאריך לצורך מיון כרונולוגי
        df_filtered['Exp_Date_Parsed'] = pd.to_datetime(df_filtered['Expiration Date'])
        df_filtered = df_filtered.sort_values(by=['Exp_Date_Parsed', 'Strike'], ascending=[True, True])
        df_filtered = df_filtered.drop(columns=['Exp_Date_Parsed'])

        # הוספת כותרת לכל קובץ
        output_rows.append([f"Source File: {file}"])

        # 3 שורות ריקות בין קבצים
        if idx > 0:
            output_rows.extend([[]] * 3)

        # הוספת 3 השורות הראשונות של הקובץ למסמך הממוזג
        for stock_line in stock_lines:
            output_rows.append(next(csv.reader([stock_line])))

        # הוספת שורות האופציות המסוננות
        for row in df_filtered.itertuples(index=False, name=None):
            output_rows.append(list(row))

    output_path = os.path.join(folder, 'merged_filtered_options.csv')
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(output_rows)
    except PermissionError:
        fallback_path = os.path.join(os.getcwd(), 'merged_filtered_options.csv')
        with open(fallback_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(output_rows)
        output_path = fallback_path
        print(f"Warning: could not write to '{os.path.join(folder, 'merged_filtered_options.csv')}', wrote to '{output_path}' instead.")

    return output_path


if __name__ == '__main__':
    folder = 'bac'
    csv_text = build_filtered_csv_text(folder=folder)
    print(f'Built filtered CSV text from folder: {folder}, length={len(csv_text)}')

    api_key = os.environ.get('GEMINI_API_KEY')
    agent_id = os.environ.get('GEMINI_AGENT_ID', 'csv-united-agent')
    if api_key:
        result = send_to_gemini_csv_text(
            agent_id=agent_id,
            api_key=api_key,
            csv_text=csv_text,
            instructions='אנא נתח את קובץ ה-CSV והכן סיכום של האופציות הרלוונטיות.',
        )
        print(result)
    else:
        print('GEMINI_API_KEY not set; skipping Gemini send.')