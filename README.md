# DACS 3.0 - מערכת ניתוח אופציות אוטומטית

## 🚀 Quick Start

### הרצה מקומית:
```bash
python csv_united.py
```

### הרצה אוטומטית בענן (GitHub Actions):
📖 **[GITHUB-QUICKSTART.md](GITHUB-QUICKSTART.md)** - הגדרה ב-5 דקות!

---

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
- **שומר דו"ח HTML** מעוצב בתיקיית הקלט (לדוגמה: `assets/AAPL/AAPL_DACS-3.0_20260728_111829.html`)

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
EMAIL_RECIPIENTS=user1@gmail.com,user2@gmail.com  # אופציונלי - נמענים מרובים
SEND_EMAIL=1                          # 1=שלח מיילים, 0=כבה
```

**לקבלת API Key:**
- Gemini: https://ai.google.dev/
- Gmail App Password: https://myaccount.google.com/apppasswords

**לשליחת מיילים למספר נמענים:** ראה [docs/EMAIL-MULTIPLE-RECIPIENTS.md](docs/EMAIL-MULTIPLE-RECIPIENTS.md)

### 3. הגדרות נוספות ב-`csv_united.py`:
```python
DELTA_MIN = 0.07                # טווח Delta מינימלי
DELTA_MAX = 0.21                # טווח Delta מקסימלי
AUTO_SEND_EMAIL = False         # True = שליחת מייל אוטומטית
```

**הערה:** המערכת עובדת דינמית - מניות נשלפות אוטומטית מ-Barchart Screener.
אין צורך להגדיר מניות ספציפיות בקוד!

## שימוש

### ריצה רגילה (מומלץ) - ניתוח מלא
```bash
python csv_united.py
```
**מה זה עושה:**
1. שליפת מניות מ-Barchart Screener
2. מיזוג קבצי CSV עבור כל מניה
3. ניתוח Gemini עם הוראות DACS-3.0
4. יצירת דו"ח HTML מעוצב לכל מניה
5. שליחת מיילים (אם `AUTO_SEND_EMAIL=True`)

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
from csv_united import process_all_assets

# ניתוח מלא של כל המניות (אוטומטי מה-screener)
results = process_all_assets(merge_only=False)

# רק מיזוג בלי Gemini
results = process_all_assets(merge_only=True)
```

## מבנה קבצים

```
dacs3/
├── csv_united.py              # הקוד הראשי
├── assets/                    # תיקיית קבצי CSV (נוצרת דינמית מה-screener)
│   ├── AAPL/                  # כל מניה בתיקייה נפרדת
│   │   ├── *.csv              # קבצי אופציות
│   │   ├── merged_filtered_options.csv
│   │   └── AAPL_DACS-3.0_*.html
│   ├── MSFT/
│   └── ...
├── scraper-ts/                # TypeScript scraper (Barchart + CBOE)
│   ├── src/
│   └── package.json
├── agent-docs/                # מסמכי ידע של DACS Gem
│   ├── 01_DACS_GPTS_MASTER_INSTRUCTIONS.txt
│   ├── 03_DACS_1_MONTHLY_RULES.docx
│   └── .gemini_files_cache.json  # Cache (נוצר אוטומטית)
└── README.md                  # המסמך הזה
```

## פונקציות עיקריות

### `process_all_assets(merge_only=False)`  🆕
מעבד את **כל המניות** שנשלפו מה-screener:
- מיזוג CSV לכל מניה
- ניתוח Gemini עם DACS-3.0 (אלא אם `merge_only=True`)
- יצירת HTML reports
- שליחת מיילים

### `process_csv_folder(folder)`
מעבד תיקייה בודדת - יוצר קובץ מאוחד.

### `send_to_gem(folder)`  🆕
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
from csv_united import clear_gemini_cache, process_all_assets

clear_gemini_cache()
results = process_all_assets()  # יעלה מחדש את המסמכים
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

## 📚 תיעוד נוסף

- 📖 [GEM_USAGE.md](GEM_USAGE.md) - שימוש ב-Gemini Gem
- 🚀 [GITHUB-QUICKSTART.md](GITHUB-QUICKSTART.md) - הרצה אוטומטית בענן
- 📧 [docs/EMAIL-MULTIPLE-RECIPIENTS.md](docs/EMAIL-MULTIPLE-RECIPIENTS.md) - שליחת מיילים למספר נמענים
- 📂 [docs/](docs/) - תיעוד מלא (24 מסמכים)

## 🔄 GitHub Actions Pipeline

המערכת יכולה לרוץ **אוטומטית בענן** עם GitHub Actions:

- ✅ **חינמי** - 2,000 דקות/חודש
- ✅ **אוטומטי** - 3 פעמים בשבוע
- ✅ **מהימן** - רץ בענן של GitHub
- ✅ **דוחות** - נשמרים 30 יום

**התחל כאן:** [GITHUB-QUICKSTART.md](GITHUB-QUICKSTART.md)
