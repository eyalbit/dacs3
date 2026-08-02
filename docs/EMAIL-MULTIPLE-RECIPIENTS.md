# שליחת מיילים למספר נמענים

## סקירה כללית
המערכת תומכת בשליחת דוחות DACS-3.0 למספר נמענים בו-זמנית באמצעות משתנה סביבה ייעודי.

## הגדרה

### 1. הגדרה מקומית (קובץ .env)

הוסף את השורה הבאה לקובץ `.env`:

```bash
EMAIL_RECIPIENTS=email1@gmail.com,email2@gmail.com,email3@example.com
```

**דוגמה מלאה:**
```bash
# Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password-here
EMAIL_RECIPIENTS=eb.bitan@gmail.com,user2@gmail.com,manager@company.com
SEND_EMAIL=1
```

### 2. הגדרה ב-GitHub Actions

הוסף משתנה Secret חדש בשם `EMAIL_RECIPIENTS`:

1. עבור ל-**Settings** → **Secrets and variables** → **Actions**
2. לחץ על **New repository secret**
3. שם: `EMAIL_RECIPIENTS`
4. ערך: `email1@gmail.com,email2@gmail.com,email3@example.com`
5. לחץ על **Add secret**

## פורמט

- **הפרדה:** השתמש בפסיק (`,`) להפרדה בין כתובות מייל
- **רווחים:** רווחים לפני/אחרי הפסיק מתעלמים אוטומטית
- **דוגמאות תקינות:**
  ```
  user1@gmail.com,user2@gmail.com
  user1@gmail.com, user2@gmail.com, user3@example.com
  user1@gmail.com,   user2@gmail.com  ,user3@example.com
  ```

## עדיפות

אם משתנה `EMAIL_RECIPIENTS` מוגדר, הוא גובר על כתובת ברירת המחדל (`eb.bitan@gmail.com`) שמוגדרת בקוד.

**סדר עדיפות:**
1. `EMAIL_RECIPIENTS` ממשתני סביבה → **עדיפות ראשונה**
2. פרמטר `to_email` שהועבר לפונקציה
3. `EMAIL_TO` מהקוד (ברירת מחדל)

## התנהגות

### שליחת מייל רגילה (דוח HTML)
```python
send_email_with_html_report('assets/AAPL/DACS_AAPL_20260730_120000.html')
```
- שולח את הדוח לכל הנמענים ב-`EMAIL_RECIPIENTS`
- כל הנמענים מקבלים את אותו מייל עם כל הקבצים המצורפים

### שליחת התראה על אי-מציאת סימולים
```python
send_no_symbols_email('https://www.barchart.com/screener/stocks/...')
```
- שולח התראה לכל הנמענים ב-`EMAIL_RECIPIENTS`
- כל הנמענים מקבלים את אותה הודעה

## דוגמאות

### דוגמה 1: שליחה לנמען בודד
```bash
EMAIL_RECIPIENTS=eb.bitan@gmail.com
```

### דוגמה 2: שליחה ל-3 נמענים
```bash
EMAIL_RECIPIENTS=trader1@gmail.com,trader2@gmail.com,manager@company.com
```

### דוגמה 3: שליחה לצוות שלם
```bash
EMAIL_RECIPIENTS=team1@company.com,team2@company.com,analyst@company.com,manager@company.com,ceo@company.com
```

## בדיקה

### בדיקה מקומית
```bash
# הוסף ל-.env
EMAIL_RECIPIENTS=your-test-email@gmail.com
SEND_EMAIL=1

# הרץ את התסריט
python csv_united.py --no-scrape
```

### בדיקה ב-GitHub Actions
```bash
# הוסף את ה-Secret: EMAIL_RECIPIENTS=your-test-email@gmail.com
# הרץ את ה-workflow ידנית מ-Actions tab
```

## פלט לוג

בעת שליחת מייל, תראה:

```
[i] Email config:
    From: your-email@gmail.com
    To: email1@gmail.com, email2@gmail.com, email3@example.com
    Server: smtp.gmail.com:587
  Attaching 3 files...
    - DACS_AAPL_20260730_120000.html
    - merged_filtered_options.csv
    - analysis_summary.txt
Sending email to 3 recipient(s): email1@gmail.com, email2@gmail.com, email3@example.com
  Trying port 587 (TLS)...
[OK] Email sent successfully to 3 recipient(s)
```

## שגיאות נפוצות

### שגיאה: "No valid email recipients provided"
- **סיבה:** `EMAIL_RECIPIENTS` ריק או מכיל רק רווחים
- **פתרון:** הוסף לפחות כתובת מייל אחת תקינה

### שגיאה: "Missing email credentials"
- **סיבה:** `GMAIL_USER` או `GMAIL_PASSWORD` לא מוגדרים
- **פתרון:** הגדר את שני המשתנים ב-.env או ב-GitHub Secrets

## הערות חשובות

1. **Gmail App Password:** חייב להשתמש ב-App Password של Gmail, לא בסיסמה רגילה
   - צור אחד ב: https://myaccount.google.com/apppasswords

2. **מגבלות Gmail:** Gmail מגביל את מספר הנמענים למייל בודד (~100)
   - לצרכים רגילים זה מספיק

3. **פרטיות:** כל הנמענים רואים את כל הכתובות האחרות (שדה TO)
   - אם זה רגיש, שלח מיילים נפרדים בלולאה

4. **SEND_EMAIL:** אפילו עם `EMAIL_RECIPIENTS` מוגדר, חייב להגדיר `SEND_EMAIL=1`
   - בלי זה, המערכת לא תשלח מיילים כלל

## קבצים שונו

1. [.env.example](.env.example) - הוספת `EMAIL_RECIPIENTS` לדוגמה
2. [csv_united.py](csv_united.py) - עדכון פונקציות השליחה
3. [.github/workflows/dacs-analysis.yml](.github/workflows/dacs-analysis.yml) - הוספת המשתנה לסביבת CI/CD

## תמיכה

לשאלות או בעיות, צור Issue ב-GitHub או פנה ל: eb.bitan@gmail.com
