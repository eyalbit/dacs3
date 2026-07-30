# GitHub Actions Pipeline - הגדרה ושימוש

## מה זה GitHub Actions?

GitHub Actions הוא שירות CI/CD חינמי של GitHub שמאפשר להריץ קוד אוטומטית:
- **חינם:** 2,000 דקות/חודש לחשבונות חינמיים
- **אוטומטי:** רצים לפי לוח זמנים או ידני
- **מהימן:** רץ בענן של GitHub

---

## הגדרה ראשונית

### שלב 1: העלה את הקוד ל-GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit with DACS 3.0 pipeline"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR-USERNAME/dacs-3-agent.git
git branch -M main
git push -u origin main
```

---

### שלב 2: הגדר Secrets

עבור ל-GitHub → Repository → Settings → Secrets and variables → Actions

הוסף את ה-Secrets הבאים:

#### 1. **GEMINI_API_KEY**
```
Value: AIzaSyCKgPprurCmlUekWAv-ZmYEhxYMvH2QVg8
```

#### 2. **GMAIL_USER**
```
Value: eb.bitan@gmail.com
```

#### 3. **GMAIL_PASSWORD**
```
Value: dgojbofrmqmpzxhy
```

#### 4. **BARCHART_EMAIL**
```
Value: eb.bitan@gmail.com
```

#### 5. **BARCHART_PASSWORD**
```
Value: 100%Gamba
```

#### 6. **BARCHART_SCREENER_URL**
```
Value: https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448
```

**חשוב:** לעולם אל תשתף את ה-Secrets האלה במקום ציבורי!

---

## לוח זמנים אוטומטי

הצינור מוגדר לרוץ אוטומטית:

### ⏰ מתי רץ?

```yaml
schedule:
  - cron: '0 9 * * 1,3,5'
```

**משמעות:**
- **ימי:** שני, רביעי, שישי
- **שעה:** 09:00 UTC = 11:00 בישראל (חורף) / 12:00 (קיץ)

### לשנות את הלוח זמנים:

ערוך `.github/workflows/dacs-analysis.yml`:

```yaml
# כל יום בשעה 10:00 UTC
- cron: '0 10 * * *'

# כל יום ראשון בשעה 08:00 UTC
- cron: '0 8 * * 0'

# כל יום בשעה 06:00 ו-18:00 UTC
- cron: '0 6,18 * * *'
```

**מחשבון Cron:** https://crontab.guru/

---

## הרצה ידנית

### מתי להשתמש?
- בדיקות
- צריך ניתוח מיידי
- לא רוצה לחכות ללוח זמנים

### איך?

1. עבור ל-GitHub → Repository → Actions
2. בחר "DACS 3.0 Automated Analysis"
3. לחץ "Run workflow"
4. בחר branch (main)
5. **אופציונלי:** סמן "Send email with results"
6. לחץ "Run workflow"

---

## מבנה הצינור

### 📋 שלבים (Steps):

#### 1. **Checkout repository**
- מוריד את הקוד מ-GitHub

#### 2. **Set up Python & Node.js**
- מתקין Python 3.12
- מתקין Node.js 22

#### 3. **Install dependencies**
- `pip install -r requirements.txt`
- `npm ci` (בתיקיית scraper-ts)

#### 4. **Create .env files**
- יוצר `.env` מ-Secrets
- גם עבור root וגם עבור scraper-ts

#### 5. **Install Playwright**
- מתקין דפדפן Chromium לסקריפר

#### 6. **Run Barchart Screener**
- `npm run screener`
- שומר לוג
- סופר כמה מניות נמצאו

#### 7. **Run DACS Analysis**
- `python csv_united.py --no-scrape`
- מעבד את הנתונים
- יוצר HTML reports

#### 8. **Upload reports**
- שומר דוחות ב-Artifacts
- נשמר 30 יום

#### 9. **Send summary**
- יוצר סיכום בממשק GitHub

---

## תוצאות ההרצה

### איפה לראות?

**GitHub → Actions → בחר הרצה**

תראה:
```
✓ Checkout repository
✓ Set up Python
✓ Run Barchart Screener
  Symbols found: 4
✓ Run DACS Analysis
  Assets processed: 4
✓ Upload reports
```

### לוג מלא:

לחץ על כל שלב לראות לוג מפורט.

### דוחות שנוצרו:

לחץ על **Artifacts** בתחתית הדף:
```
📦 dacs-reports-123
  - BRK.B_DACS-3.0_20260730.html
  - EA_DACS-3.0_20260730.html
  - V_DACS-3.0_20260730.html
  - XLV_DACS-3.0_20260730.html
  - merged_filtered_options.csv (x4)
  - screener.log
  - analysis.log
```

הורד את ה-ZIP ופתח.

---

## שליחת מייל מהצינור

### מצב נוכחי:

המייל **מושבת** בברירת מחדל:
```python
AUTO_SEND_EMAIL = False  # csv_united.py line 50
```

### איך להפעיל?

#### אופציה 1: תמיד שלח מייל

ערוך `csv_united.py`:
```python
AUTO_SEND_EMAIL = True
```

Commit ו-Push.

#### אופציה 2: בחר בזמן ההרצה

כשרצים **ידנית**, סמן:
```
☑ Send email with results
```

(נדרש שינוי קטן בקוד - אגיד לך איך)

---

## מגבלות GitHub Actions

### תכנית חינמית:

| מגבלה | ערך |
|-------|-----|
| דקות/חודש | 2,000 |
| זמן הרצה מקס' | 6 שעות |
| משימות במקביל | 20 |
| Artifacts | 500 MB |

### כמה דקות ההרצה שלנו?

**משוער:**
- Screener: ~3 דקות
- Analysis: ~1 דקה
- **סה"כ:** ~4 דקות

**ריצות בחודש:**
- 3 ימים/שבוע × 4 שבועות = 12 ריצות
- 12 × 4 דקות = **48 דקות**

**נשאר:** 2,000 - 48 = **1,952 דקות** ✅

**מספיק בשפע!**

---

## פתרון בעיות

### בעיה 1: "Secret not found"

**סיבה:** שכחת להגדיר Secret ב-GitHub

**פתרון:**
1. GitHub → Settings → Secrets
2. הוסף את כל 6 ה-Secrets
3. הרץ שוב

---

### בעיה 2: "Playwright timeout"

**סיבה:** Barchart לוקח זמן / בעיית רשת

**פתרון:**
- הצינור ינסה שוב אוטומטית
- אם נכשל 3 פעמים, בדוק את Barchart credentials

---

### בעיה 3: "No symbols found"

**סיבה:** הסקרינר ריק או URL שגוי

**פתרון:**
1. בדוק `BARCHART_SCREENER_URL`
2. וודא שיש מניות בסקרינר שלך
3. בדוק את הלוג: Artifacts → screener.log

---

### בעיה 4: "Email failed"

**סיבה:** Gmail credentials לא נכונים

**פתרון:**
1. בדוק `GMAIL_USER` ו-`GMAIL_PASSWORD`
2. וודא שזה Gmail App Password
3. הצינור ימשיך - המיילים לא חובה

---

## הרצה מקומית (לבדיקה)

לפני Push ל-GitHub, בדוק מקומית:

```bash
# 1. התקן dependencies
pip install -r requirements.txt
cd scraper-ts && npm install && cd ..

# 2. וודא .env files קיימים
cat .env
cat scraper-ts/.env

# 3. הרץ צינור מקומי
cd scraper-ts && npm run screener
cd .. && python csv_united.py --no-scrape

# 4. בדוק תוצאות
ls assets/*/DACS*.html
```

אם עובד מקומית → יעבוד ב-GitHub Actions ✅

---

## קבצים חשובים

### צינור:
```
.github/
└── workflows/
    └── dacs-analysis.yml  ← הגדרות הצינור
```

### לא להעלות ל-GitHub:
```
.env
scraper-ts/.env
assets/
*.log
__pycache__/
```

הוסף ל-`.gitignore`:
```gitignore
.env
scraper-ts/.env
assets/
*.log
__pycache__/
node_modules/
.playwright/
```

---

## סיכום Quick Start

### 1. העלה לGitHub:
```bash
git add .
git commit -m "Add GitHub Actions pipeline"
git push
```

### 2. הגדר 6 Secrets:
- GEMINI_API_KEY
- GMAIL_USER
- GMAIL_PASSWORD
- BARCHART_EMAIL
- BARCHART_PASSWORD
- BARCHART_SCREENER_URL

### 3. הרץ ידנית (בדיקה):
GitHub → Actions → Run workflow

### 4. המתן ללוח זמנים:
שני, רביעי, שישי בשעה 11:00

---

## לוח זמנים מומלץ

### שוק ארה"ב:
- פתיחה: 16:30 ישראל
- סגירה: 23:00 ישראל

### ריצות מומלצות:

**לפני פתיחת שוק:**
```yaml
- cron: '0 12 * * 1-5'  # 14:00 ישראל, לפני פתיחה
```

**אחרי סגירת שוק:**
```yaml
- cron: '0 21 * * 1-5'  # 23:00 ישראל, אחרי סגירה
```

---

## עלות

**GitHub Actions:**
- חינמי: 2,000 דקות/חודש ✅
- ההרצה שלנו: ~4 דקות
- 3 ריצות/שבוע = 12 ריצות/חודש
- **סה"כ:** 48 דקות/חודש
- **עלות:** $0 💰

---

**המערכת מוכנה לענן!** ☁️🚀

**תאריך:** 30 יולי 2026
