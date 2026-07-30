# שינויים: טיפול במצב "אין תוצאות מהסקרינר"

## תיאור השינוי
המערכת כעת מזהה אוטומטית כאשר הסקרינר של Barchart מחזיר הודעה "No symbols found that match the requirements" ושולחת מייל התראה למשתמש במקום לנסות לעבד תוצאות שלא קיימות.

## קבצים ששונו

### 1. TypeScript (Screener)

#### `scraper-ts/src/pages/BarchartScreenerPage.ts`
- **שורות 92-107**: הוספת מתודה `hasNoSymbolsMessage()` שבודקת את תוכן הדף לטקסט "No symbols found that match the requirements"
- **שורות 108-119**: עדכון מתודה `hasResults()` לבדוק תחילה אם יש הודעת "אין סימולים"
- **שורות 264-292**: עדכון `runScreener()` להחזיר דגל `noSymbolsFound: true` כשאין תוצאות

#### `scraper-ts/src/skills/BarchartScreenerSkill.ts`
- **שורות 22-28**: הוספת שדה `noSymbolsFound?: boolean` ל-interface `ScreenerResult`
- **שורות 95-106**: טיפול מיוחד במקרה של `noSymbolsFound` - החזרת תוצאה מוצלחת עם מערך סימולים ריק

#### `scraper-ts/src/cli-screener.ts`
- **שורות 158-179**: בדיקה אם `noSymbolsFound === true` ויצירת קובץ מרקר `NO_SYMBOLS_FOUND.json` עם פרטי הסקרינר

### 2. Python (Analysis & Email)

#### `csv_united.py`
- **שורות 922-1024**: פונקציה חדשה `send_no_symbols_email()` ששולחת מייל התראה כשאין תוצאות
- **שורות 1341-1377**: עדכון `process_all_assets()`:
  - בדיקה אם קיים קובץ `assets/NO_SYMBOLS_FOUND.json`
  - קריאת פרטי הסקרינר מהקובץ
  - שליחת מייל התראה אם `SEND_EMAIL=1`
  - החזרת מערך ריק (אין אסטים לעיבוד)

## זרימת העבודה

### תרחיש: אין תוצאות מהסקרינר

1. **TypeScript Scraper** (`cli-screener.ts`):
   - מריץ את הסקרינר ב-Barchart
   - מזהה טקסט "No symbols found that match the requirements" בדף
   - יוצר קובץ `assets/NO_SYMBOLS_FOUND.json`:
     ```json
     {
       "timestamp": "2026-07-30T10:15:30.000Z",
       "screenerUrl": "https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448",
       "screenerName": "Base Screener-DACS3 for CALL",
       "message": "No symbols found that match the requirements"
     }
     ```
   - מסיים בהצלחה (`exit 0`)

2. **Python Analysis** (`csv_united.py`):
   - מריץ את `process_all_assets()`
   - מזהה קובץ `NO_SYMBOLS_FOUND.json`
   - מדפיס הודעה למסוף:
     ```
     ================================================================================
     NO SYMBOLS FOUND FROM SCREENER
     ================================================================================
     [!] No symbols found that match the requirements
     [i] Screener: Base Screener-DACS3 for CALL
     [i] URL: https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448
     ```
   - אם `SEND_EMAIL=1`, שולח מייל עם הנושא:
     ```
     ⚠️ DACS-3.0: No Symbols Found - 30/07/2026 12:15
     ```
   - המייל כולל:
     - פרטי הסקרינר (שם + URL)
     - תאריך ושעה
     - הודעה ברורה שאין עסקאות לעיבוד
     - המלצות לפעולה (בדיקת פילטרים, תנאי שוק וכו')

## שליחת מייל

### תוכן המייל כשאין תוצאות:
```
⚠️ DACS-3.0 Screener Alert: No Results
============================================================

The Barchart screener did not find any symbols matching the requirements.

Screener Details:
  • Name: Base Screener-DACS3 for CALL
  • URL: https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448
  • Date: 30/07/2026 12:15

Message:
  No symbols found that match the requirements.

Action Required:
  • Verify the screener filters are correct
  • Check if market conditions have changed
  • Consider adjusting the screening criteria

No trades will be processed for this run.

============================================================
Automated message from DACS-3.0 Analysis System
```

## הפעלה ידנית לבדיקה

### הרצת הסקרינר בלבד (TypeScript):
```bash
cd scraper-ts
npm run screener
```

### הרצת הניתוח המלא (Python):
```bash
python csv_united.py --no-scrape
```

## משתני סביבה נדרשים

וודא שהמשתנים הבאים מוגדרים ב-`.env`:
```env
# Barchart
BARCHART_EMAIL=your-email@example.com
BARCHART_PASSWORD=your-password
BARCHART_SCREENER_URL=https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=YOUR_ID

# Email (אופציונלי - רק אם רוצים לשלוח מיילים)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
SEND_EMAIL=1  # 1=enable, 0=disable
```

## GitHub Actions

ב-GitHub Actions (`.github/workflows/dacs-analysis.yml`), המערכת:
1. מריצה `npm run screener` בתיקיה `scraper-ts`
2. מחפשת את מספר הסימולים בלוג: `grep -oP 'Symbols found: \K\d+'`
3. מריצה `python csv_united.py --no-scrape`
4. אם `SEND_EMAIL=1` ב-Secrets, שולחת מייל אוטומטית

אם אין תוצאות, המערכת תשלח מייל עם ההתראה במקום לנסות לעבד קבצים שלא קיימים.

## בדיקות שמומלץ לבצע

1. **בדיקה ידנית** - הרץ את הסקרינר עם פילטרים שלא יחזירו תוצאות
2. **בדיקת מייל** - ודא ש-`SEND_EMAIL=1` ובדוק שהמייל מגיע
3. **בדיקת GitHub Actions** - הרץ workflow ידנית ובדוק את הלוגים
