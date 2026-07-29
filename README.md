# DACS 3.0 - מיזוג וניתוח קבצי אופציות

## תיאור
מערכת לעיבוד קבצי CSV של שרשראות אופציות (Option Chains) ושליחתם לניתוח ב-Gemini AI עם תצורת DACS Gem המלאה.

## יכולות

### 1. מיזוג קבצי CSV
- קורא מספר קבצי CSV מתיקייה
- מסנן שורות לפי Delta (0.07-0.21 ל-Calls, -0.21 ל--0.07 ל-Puts)
- מוצא את ה-ATM strike הקרוב ביותר
- יוצר קובץ מאוחד `merged_filtered_options.csv`

### 2. שליחה ל-Gemini (רגיל)
- שולח את הקובץ המאוחד כטקסט
- קבלת ניתוח בסיסי

### 3. שליחה ל-DACS Gem 🆕
- מעלה את כל קבצי הידע מ-`agent-docs/`
- מפעיל את ההוראות המלאות של DACS
- מנתח לפי כללי DACS-3.0 ו-DACS-1
- **עובד בדיוק כמו ה-Gem הפרטי ב-Gemini!**
- **שומר דו"ח HTML** מעוצב בתיקיית הקלט (לדוגמה: `bac/bac_DACS-3.0_20260728_111829.html`)

## התקנה

### 1. העתק את `.env.example` ל-`.env`
```bash
cp .env.example .env
```

### 2. ערוך את `.env` והוסף את המפתחות:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
GMAIL_USER=your-email@gmail.com       # אופציונלי - לשליחת מיילים
GMAIL_PASSWORD=your-app-password      # אופציונלי - לשליחת מיילים
```

**לקבלת API Key:**
- Gemini: https://ai.google.dev/
- Gmail App Password: https://myaccount.google.com/apppasswords

### 3. הגדרות נוספות ב-`csv_united.py`:
```python
DEFAULT_ASSET = 'bac'           # שנה ל: 'spy', 'iwm', 'jpm'
DELTA_MIN = 0.07                # טווח Delta מינימלי
DELTA_MAX = 0.21                # טווח Delta מקסימלי
AUTO_SEND_EMAIL = False         # True = שליחת מייל אוטומטית
```

## שימוש

### ריצה רגילה (מומלץ) - ניתוח מלא
```bash
python csv_united.py
```
**מה זה עושה:**
1. מיזוג קבצי CSV מהתיקייה (לפי `DEFAULT_ASSET`)
2. ניתוח Gemini עם הוראות DACS-3.0
3. יצירת דו"ח HTML מעוצב
4. שליחת מייל (אם `AUTO_SEND_EMAIL=True`)

### ריצה חלקית - רק מיזוג CSV
```bash
python csv_united.py --merge-only
```
**שימושי כש:**
- רוצה רק לראות את הקובץ המאוחד
- אין צורך בניתוח Gemini
- בודק שהנתונים נטענים נכון

### משימוש בקוד Python
```python
from csv_united import send_to_gem, process_csv_folder

# רק מיזוג
output_path = process_csv_folder(folder='assets/bac')

# ניתוח מלא
result = send_to_gem(folder='assets/bac')
```

## מבנה קבצים

```
dacs3/
├── csv_united.py              # הקוד הראשי
├── example_gem_usage.py       # דוגמת שימוש
├── test_csv_united.py         # טסטים
├── bac/                       # תיקיית קבצי CSV (input)
│   └── *.csv
├── agent-docs/                # מסמכי ידע של DACS Gem
│   ├── 01_DACS_GPTS_MASTER_INSTRUCTIONS_READY_TO_PASTE.txt
│   ├── 03_DACS_1_MONTHLY_RULES.docx
│   ├── 04_DACS_OUTPUT_PROTOCOL.docx
│   ├── 05_OPTIONSTRAT_URL_PROTOCOL.docx
│   ├── 06_DACS_INPUT_DATA_CONTRACT.docx
│   └── .gemini_files_cache.json  # Cache (נוצר אוטומטית)
├── GEM_USAGE.md               # הסבר מפורט
└── README.md                  # המסמך הזה
```

## פונקציות עיקריות

### `process_csv_folder(folder='bac')`
מעבד את כל קבצי ה-CSV בתיקייה ויוצר קובץ מאוחד.

### `send_merged_file_to_gemini(...)`
שולח את הקובץ המאוחד ל-Gemini API (בלי Gem configuration).

### `send_to_gem(...)`  🆕
שולח עם תצורת DACS Gem המלאה:
- System Instructions
- Knowledge files
- File upload (לא inline text)

### `clear_gemini_cache()`
מנקה את ה-cache של קבצים שהועלו (אם עדכנת משהו ב-agent-docs).

## Cache Management

בפעם הראשונה, הקבצים מ-`agent-docs/` מועלים ל-Gemini והURIs שלהם נשמרים ב-cache.

**אם עדכנת קובץ ב-agent-docs:**
```python
from csv_united import clear_gemini_cache, send_to_gem

clear_gemini_cache()
result = send_to_gem(folder='bac', force_reupload_docs=True)
```

או פשוט מחק:
```bash
rm agent-docs/.gemini_files_cache.json
```

## פורמט קלט (CSV)

הקוד מצפה לקבצי CSV עם:
- עמודות: Expiration, Strike, Delta (עמודה 8 לCalls, 19 לPuts)
- 3 שורות ראשונות: metadata (כולל `Last: <price>`)
- שורה 4+: נתוני אופציות

## Troubleshooting

### שגיאת "Missing GEMINI_API_KEY"
```bash
export GEMINI_API_KEY="your-key"
```

### שגיאת "File processing timeout"
הקבצים גדולים, Gemini צריך זמן. נסה שוב או חלק את הקבצים.

### שגיאת upload
- בדוק שה-API Key תקף
- בדוק quota ב-Google Cloud Console
- ודא שהקבצים קיימים ב-`agent-docs/`

## תרומה / פיתוח

להוסיף טסטים:
```bash
python test_csv_united.py
```

## רישיון
כל הזכויות שמורות

---

📖 למידע מפורט על שימוש ב-Gem, ראה [GEM_USAGE.md](GEM_USAGE.md)
