# הגדרת Barchart Screener למערכת DACS 3.0

## מה זה Screener?

Barchart Screener הוא כלי לסינון מניות לפי קריטריונים שונים (נפח, תנודתיות, IV וכו').  
במקום לנתח רשימה קבועה של מניות (BAC, IWM, JPM, SPY), המערכת תנתח **רק את המניות שעוברות את הסינון שלך ב-Barchart**.

---

## תהליך ההתקנה

### שלב 1: צור Screener ב-Barchart

1. **התחבר לBarchart:**  
   https://www.barchart.com/login

2. **לך ל-My Screeners:**  
   https://www.barchart.com/my/screeners

3. **צור Screener חדש** או **פתח screener קיים** שמותאם ל-DACS-3.0

4. **העתק את ה-URL** של ה-screener שלך:
   ```
   דוגמה: https://www.barchart.com/screener/stocks/67f3f0cf45
                                                      ^^^^^^^^^^^^
                                                      זה ה-ID שלך
   ```

---

### שלב 2: הגדר את קובץ `.env`

1. **העתק את `.env.example` ל-`.env`:**
   ```bash
   cp .env.example .env
   ```

2. **ערוך את `.env` והוסף את פרטי Barchart:**

   ```env
   # ===== Barchart Screener Configuration =====
   BARCHART_EMAIL=your-email@example.com
   BARCHART_PASSWORD=your-password
   BARCHART_SCREENER_URL=https://www.barchart.com/screener/stocks/67f3f0cf45
   BARCHART_LOGIN_URL=https://www.barchart.com/login

   # ===== Gemini API (חובה) =====
   GEMINI_API_KEY=your-gemini-api-key

   # ===== Email (אופציונלי) =====
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=your-app-password
   ```

3. **שמור את הקובץ**

---

### שלב 3: התקן Dependencies

```bash
cd scraper-ts
npm install
cd ..
```

---

### שלב 4: בדוק שה-Screener עובד

```bash
cd scraper-ts
npm run screener
```

**פלט צפוי:**
```
🚀 Starting Barchart Screener...

✅ Screener completed successfully!

📊 Results:
   Symbols found: 5
   Symbols: AAPL, MSFT, GOOGL, TSLA, NVDA

📁 Screener CSV Files:
   AAPL: ../assets/AAPL/screener.csv
   MSFT: ../assets/MSFT/screener.csv
   ...

📊 Extracting Option Chains from CBOE...

📁 Option Chain CSV Files:
   AAPL:
     1. ../assets/AAPL/AAPL_quotedata_Jul_2026_2026-07-30.csv
     2. ../assets/AAPL/AAPL_quotedata_Aug_2026_2026-07-30.csv
   ...
```

אם זה עובד ← המערכת מוכנה! 🎉

---

## הרצת המערכת המלאה

### אופציה 1: Screener + ניתוח מלא
```bash
python csv_united.py
```

זה יריץ:
1. ✅ Barchart Screener (מושך מניות)
2. ✅ הורדת Options Chains מ-CBOE
3. ✅ סינון CSV (Delta, DTE)
4. ✅ ניתוח Gemini
5. ✅ יצירת דוחות HTML

---

### אופציה 2: ניתוח בלבד (ללא scraping)
```bash
python csv_united.py --no-scrape
```

משתמש בנתונים קיימים ב-`assets/` (מריצה קודמת).

---

### אופציה 3: Screener בלבד (ללא Gemini)
```bash
cd scraper-ts
npm run screener
```

רק מושך נתונים, לא מנתח.

---

## מבנה התיקיות

```
assets/
├── AAPL/                                    ← כל מניה מה-Screener מקבלת תיקייה
│   ├── screener.csv                         ← נתונים מ-Barchart Screener
│   ├── AAPL_quotedata_Jul_2026.csv          ← Options chain (חודש נוכחי)
│   ├── AAPL_quotedata_Aug_2026.csv          ← Options chain (חודש הבא)
│   ├── merged_filtered_options.csv          ← CSV ממוזג ומסונן
│   └── AAPL_DACS-3.0_20260730_123456.html   ← דוח ניתוח
├── MSFT/
│   └── ...
└── GOOGL/
    └── ...
```

---

## פתרון בעיות

### בעיה 1: "BARCHART_SCREENER_URL must be set"

**פתרון:** ודא שה-`.env` מכיל את ה-URL המלא של ה-screener.

---

### בעיה 2: "Timeout exceeded"

**סיבות אפשריות:**
- Barchart דורש login ואתה לא מחובר
- ה-Screener דורש subscription מסוג מסוים
- האתר השתנה

**פתרון:** הרץ עם `--headless=false` כדי לראות מה קורה:
```bash
cd scraper-ts
npm run screener -- --headless=false
```

---

### בעיה 3: "No CSV files found"

**סיבה:** ה-Screener החזיר 0 מניות.

**פתרון:** 
1. בדוק את הקריטריונים ב-Screener שלך
2. וודא שיש מניות שעוברות את הסינון

---

### בעיה 4: המערכת עדיין משתמשת ב-BAC/IWM/JPM/SPY

**סיבה:** הרצת `npm run scrape` במקום `npm run screener`.

**פתרון:** ודא שאתה מריץ:
```bash
python csv_united.py  # זה אמור להריץ screener אוטומטית
```

---

## הבדלים: Screener vs. רשימה קבועה

| היבט | רשימה קבועה (ישן) | Screener (חדש) |
|------|-------------------|----------------|
| **מניות** | BAC, IWM, JPM, SPY | מניות שעוברות סינון ב-Barchart |
| **גמישות** | ❌ צריך לעדכן קוד | ✅ שנה ב-Barchart screener |
| **עדכון** | ידני | אוטומטי בכל הרצה |
| **פקודה** | `npm run scrape --all` | `npm run screener` |

---

## קריטריונים מומלצים ל-Screener

להלן הצעות לסינונים ב-Barchart screener עבור DACS-3.0:

### סינוני בסיס:
- **Price:** $20 - $500 (מניות עם נזילות)
- **Average Volume:** > 1M (נזילות גבוהה)
- **Options Volume:** > 10,000 (אופציות נזילות)

### סינוני IV:
- **Implied Volatility (30-day):** 25% - 35% (backwardation potential)
- **IV Rank:** > 50% (גבוה יחסית להיסטוריה)

### סינונים נוספים:
- **Market Cap:** > $5B (חברות יציבות)
- **Bid-Ask Spread:** < 10 cents (נזילות טובה)
- **Open Interest:** > 500 (לפי כללי DACS)

---

## תרשים זרימה

```
User → Barchart Screener
         ↓
    Screener returns symbols: [AAPL, MSFT, ...]
         ↓
    Download Options Chains מ-CBOE
         ↓
    Python filters CSV (Delta, DTE)
         ↓
    Gemini analyzes
         ↓
    HTML Reports created
```

---

## עדכון להוראות Gemini

הוספנו ל-Prompt של Gemini:

```
IMPORTANT: Analyze ONLY the symbols provided in the CSV files.
These symbols were pre-filtered by the Barchart Screener based on:
- Liquidity requirements
- IV ranges suitable for DACS-3.0
- Price range for retail traders

Do NOT suggest symbols that are not in the input data.
```

---

**סטטוס:** ✅ המערכת מוכנה לעבודה עם Screener!
