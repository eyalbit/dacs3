# GitHub Actions - התחלה מהירה 🚀

## ב-5 דקות: העלה והפעל

### 1️⃣ העלה ל-GitHub (2 דקות)

```bash
# אתחול Git (אם עוד לא)
git init
git add .
git commit -m "Add DACS 3.0 with GitHub Actions"

# צור repository חדש ב-GitHub.com
# לחץ על "+" → "New repository"
# שם: dacs-3-agent
# סוג: Private (מומלץ!)

# קישור והעלאה
git remote add origin https://github.com/YOUR-USERNAME/dacs-3-agent.git
git branch -M main
git push -u origin main
```

---

### 2️⃣ הגדר Secrets (2 דקות)

עבור ל-**Repository → Settings → Secrets and variables → Actions**

לחץ **"New repository secret"** והוסף:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | `AIzaSyCKgPprurCmlUekWAv-ZmYEhxYMvH2QVg8` |
| `GMAIL_USER` | `eb.bitan@gmail.com` |
| `GMAIL_PASSWORD` | `dgojbofrmqmpzxhy` |
| `BARCHART_EMAIL` | `eb.bitan@gmail.com` |
| `BARCHART_PASSWORD` | `100%Gamba` |
| `BARCHART_SCREENER_URL` | `https://www.barchart.com/stocks/stocks-screener?viewName=filter_view&screener=478448` |

**סה"כ:** 6 secrets

---

### 3️⃣ הרץ ידנית (1 דקה)

עבור ל-**Actions** → **"DACS 3.0 Automated Analysis"**

לחץ **"Run workflow"** → **"Run workflow"**

🎉 המערכת תתחיל לרוץ!

---

## מה יקרה?

### ⏱️ זמן הרצה: ~4 דקות

```
✓ Checkout repository         (5 sec)
✓ Set up Python               (10 sec)
✓ Set up Node.js              (10 sec)
✓ Install dependencies        (30 sec)
✓ Run Barchart Screener      (3 min)
✓ Run DACS Analysis          (1 min)
✓ Upload reports             (10 sec)
```

---

### 📊 תוצאות:

בסוף ההרצה תראה:

```
## DACS 3.0 Analysis Results

**Run:** #1
**Date:** 2026-07-30 11:00:00 UTC

### Results:
- Symbols found: 4
- Assets processed: 4

### Generated Reports:
- BRK.B_DACS-3.0_20260730.html
- EA_DACS-3.0_20260730.html
- V_DACS-3.0_20260730.html
- XLV_DACS-3.0_20260730.html
```

---

### 📦 הורדת דוחות:

גלול למטה → **Artifacts** → לחץ על `dacs-reports-1`

יוריד ZIP עם:
- 4 דוחות HTML
- 4 קבצי CSV מסוננים
- לוגים

---

## לוח זמנים אוטומטי

הצינור ירוץ **אוטומטית** בימים:

- **🕐 שני** - 11:00 בוקר
- **🕐 רביעי** - 11:00 בוקר
- **🕐 שישי** - 11:00 בוקר

**לא צריך לעשות כלום!** 🎯

---

## לשנות לוח זמנים

ערוך `.github/workflows/dacs-analysis.yml`:

```yaml
schedule:
  # כל יום בשעה 14:00 (לפני פתיחת שוק ארה"ב)
  - cron: '0 12 * * 1-5'

  # או: כל יום ב-23:00 (אחרי סגירת שוק)
  - cron: '0 21 * * 1-5'
```

**מחשבון זמנים:** https://crontab.guru/

---

## עלות

**🆓 חינמי לגמרי!**

- 2,000 דקות/חודש (חינם)
- הרצה שלנו: 4 דקות
- 12 ריצות/חודש = 48 דקות
- **נשאר:** 1,952 דקות ✅

---

## פתרון בעיות מהירות

### ❌ "Secret not found"
→ חזור לשלב 2 והוסף את כל 6 ה-Secrets

### ❌ "Playwright timeout"
→ בדוק את BARCHART credentials

### ❌ "No symbols found"
→ בדוק את BARCHART_SCREENER_URL

---

## תיעוד מלא

📖 **[GITHUB-ACTIONS-SETUP.md](docs/GITHUB-ACTIONS-SETUP.md)**
- הסבר מפורט על כל שלב
- פתרון בעיות מתקדם
- שינוי הגדרות

---

**זהו! המערכת רצה בענן** ☁️

**מוכן ב-5 דקות** ⏱️  
**חינמי לגמרי** 💰  
**אוטומטי לחלוטין** 🤖

---

**יש בעיה?** קרא את [GITHUB-ACTIONS-SETUP.md](docs/GITHUB-ACTIONS-SETUP.md)
