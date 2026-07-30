# DACS-3.0 Quick Start Guide 🚀

מערכת לניתוח אופציות אוטומטי עם Gemini AI

---

## 📋 דרישות מקדימות

### 1. Node.js + npm
```powershell
node --version   # v18 ומעלה
npm --version
```

### 2. Python 3.8+
```powershell
python --version
```

### 3. Environment Variables
צור קובץ `.env` בתיקייה הראשית:

```env
# Barchart Credentials
BARCHART_EMAIL=your-email@gmail.com
BARCHART_PASSWORD=your-password
BARCHART_LOGIN_URL=https://www.barchart.com/login
BARCHART_SCREENER_URL=https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Gmail (Optional - for email reports)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
```

### 4. התקנה
```powershell
# Install TypeScript scraper dependencies
cd scraper-ts
npm install
npm run build
cd ..

# Install Playwright browsers (first time only)
cd scraper-ts
npx playwright install chromium
cd ..
```

---

## 🎯 הרצת המערכת - 3 דרכים

### אפשרות 1: הכל ביחד (מומלץ) ⭐
```powershell
.\run-full-workflow.ps1
```

**מה זה עושה:**
1. ✅ מתחבר ל-Barchart ומוציא סמלים
2. ✅ מוריד Option Chains מ-CBOE (2 חודשים לכל מניה)
3. ✅ ממזג את כל ה-CSVs
4. ✅ מריץ ניתוח Gemini עם DACS instructions
5. ✅ יוצר HTML מעוצב
6. ✅ שולח מייל (אם `AUTO_SEND_EMAIL=True`)

**תוצאות:**
- `assets/{SYMBOL}/merged_filtered_options.csv` - נתונים ממוזגים
- `assets/{SYMBOL}/{SYMBOL}_DACS-3.0_{timestamp}.html` - דוח HTML

---

### אפשרות 2: רק חילוץ נתונים
```powershell
.\run-scraper-only.ps1
```

**מה זה עושה:**
- Scrapes data from Barchart + CBOE
- Saves CSVs to `assets/{SYMBOL}/` folders

**אחרי זה תריץ ידנית:**
```powershell
python merge_csv.py
python csv_united.py --no-scrape
```

---

### אפשרות 3: רק ניתוח (על נתונים קיימים)
```powershell
.\run-analysis-only.ps1
```

**מה זה עושה:**
- Merges existing CSVs
- Runs Gemini analysis
- Creates HTML reports

**שימושי כאשר:**
- יש לך כבר CSVs טריים
- רוצה לנתח מחדש בלי לחכות לscraping

---

## 📁 מבנה תיקיות

```
dacs3/
├── scraper-ts/              # TypeScript scraper (Barchart + CBOE)
│   ├── src/
│   ├── .auth/               # Barchart session cache
│   └── package.json
│
├── assets/                  # נתונים לפי מניה
│   ├── BRK.B/
│   │   ├── BRK.B_quotedata_Jul_2026_xxx.csv    # חודש נוכחי
│   │   ├── BRK.B_quotedata_Aug_2026_xxx.csv    # חודש הבא
│   │   ├── merged_filtered_options.csv          # נתונים ממוזגים
│   │   └── BRK.B_DACS-3.0_20260730_123456.html # דוח HTML
│   ├── EA/
│   ├── V/
│   └── XLV/
│
├── agent-docs/              # DACS instructions for Gemini
│   ├── 01_DACS_GPTS_MASTER_INSTRUCTIONS.txt
│   ├── 03_DACS_1_MONTHLY_RULES.docx
│   └── ...
│
├── csv_united.py            # Main Python script (merge + Gemini + HTML)
├── merge_csv.py             # Simple CSV merger
├── .env                     # Configuration
│
└── run-full-workflow.ps1    # הסקריפט המומלץ להרצה ⭐
```

---

## ⚙️ הגדרות

### csv_united.py - תצורה
ערוך את המשתנים בתחילת הקובץ:

```python
# Email Configuration
AUTO_SEND_EMAIL = False       # True = send email automatically
EMAIL_TO = 'eb.bitan@gmail.com'

# Options Filtering
DELTA_MIN = 0.07              # Minimum Delta for CALL options
DELTA_MAX = 0.21              # Maximum Delta for CALL options
MIN_OPEN_INTEREST = 500       # Minimum OI threshold
```

### Gemini Model
ברירת מחדל: `gemini-flash-lite-latest`

לשינוי, ערוך `.env`:
```env
GEMINI_MODEL=gemini-flash-lite-latest
```

---

## 🔧 פקודות ידניות

### TypeScript Scraper
```powershell
cd scraper-ts

# Run with visible browser (for debugging)
npm run screener -- --headless=false

# Skip option chains (only Barchart)
npm run screener -- --no-option-chains

# Use different assets folder
npm run screener -- --assets ../my-assets

cd ..
```

### Python Processing
```powershell
# Full workflow (scrape + merge + Gemini + HTML + email)
python csv_united.py

# Only merge CSVs (no Gemini analysis)
python csv_united.py --merge-only

# Only merge CSVs (no scraping)
python csv_united.py --merge-only --no-scrape

# Use existing CSVs (no scraping)
python csv_united.py --no-scrape

# Simple merge (no Gemini)
python merge_csv.py
```

---

## 📊 תוצאות

### HTML Report
הקובץ HTML כולל:
- 📊 טבלאות עם כל הפוזיציות
- 💰 Fast Ratio, Margin, Credit/Debit
- 🔗 קישורים ל-OptionStrat
- 📈 ניתוח מפורט בעברית

### Merged CSV
הקובץ `merged_filtered_options.csv` כולל:
- ✅ כל האופציות מ-2 החודשים
- ✅ מסונן לפי Delta (0.07-0.21)
- ✅ Expected Move מחושב
- ✅ רק CALL options (PUT מוסר)

---

## 🐛 פתרון בעיות

### "Executable doesn't exist" (Playwright)
```powershell
cd scraper-ts
npx playwright install chromium
cd ..
```

### "GEMINI_API_KEY not found"
ודא שיש קובץ `.env` עם המפתח:
```env
GEMINI_API_KEY=your-key-here
```

### "Login failed" (Barchart)
- בדוק את ה-credentials ב-`.env`
- נסה לנקות session:
```powershell
cd scraper-ts
npm run screener -- --clear-session
cd ..
```

### "Email not sent"
- בדוק `GMAIL_USER` ו-`GMAIL_PASSWORD` ב-`.env`
- השתמש ב-Gmail App Password (לא סיסמה רגילה)
- צור App Password: https://myaccount.google.com/apppasswords

---

## 🎯 תרחיש שימוש טיפוסי

```powershell
# יום ראשון בבוקר - נתונים טריים
.\run-full-workflow.ps1

# צפייה בדוחות
cd assets/BRK.B
start BRK.B_DACS-3.0_*.html

# שינוי Delta range בקובץ csv_united.py
# ניתוח מחדש על אותם נתונים
.\run-analysis-only.ps1
```

---

## 📞 תמיכה

לשאלות או בעיות:
1. בדוק את `.env` - כל המפתחות נכונים?
2. הרץ עם `--headless=false` לראות מה קורה בדפדפן
3. בדוק את ה-logs ב-PowerShell

---

**מוכן להתחיל? הרץ:**
```powershell
.\run-full-workflow.ps1
```

🚀 **בהצלחה!**
