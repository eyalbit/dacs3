# ניקוי אוטומטי של תיקיית Assets

## מה השתנה?

הוספתי **STEP 0** בתחילת כל הרצה של `csv_united.py` שמנקה אוטומטית את תיקיית `assets/`.

## איך זה עובד?

### לפני ההרצה:
```
assets/
├── BRK.B/
│   ├── *.csv
│   └── *.html
├── EA/
└── V/
```

### אחרי STEP 0:
```
assets/
(ריק - מוכן לנתונים חדשים)
```

---

## מה נמחק?

✅ **נמחק:**
- כל תיקיות המניות הקיימות
- כל קבצי CSV ישנים
- כל דוחות HTML ישנים
- כל קובץ אחר ב-assets/

❌ **לא נמחק:**
- תיקיית `assets/bac/` (שמורה כ-backup reference)

---

## קוד שהתוסף

```python
# STEP 0: Clean assets folder before starting
print('\n' + '='*80)
print('STEP 0: CLEANING ASSETS FOLDER')
print('='*80)

if os.path.isdir(BASE_ASSETS_FOLDER):
    import shutil
    cleaned_count = 0

    for item in os.listdir(BASE_ASSETS_FOLDER):
        item_path = os.path.join(BASE_ASSETS_FOLDER, item)

        # Skip the 'bac' folder (backup reference)
        if item.lower() == 'bac':
            print(f'[i] Skipping backup folder: {item}')
            continue

        # Delete everything else
        if os.path.isdir(item_path):
            try:
                shutil.rmtree(item_path)
                print(f'[✓] Deleted folder: {item}')
                cleaned_count += 1
            except Exception as exc:
                print(f'[!] Failed to delete {item}: {exc}')
```

---

## איך זה נראה בהרצה?

```bash
$ python csv_united.py

================================================================================
STEP 0: CLEANING ASSETS FOLDER
================================================================================
[i] Skipping backup folder: bac
[✓] Deleted folder: BRK.B
[✓] Deleted folder: EA
[✓] Deleted folder: V
[✓] Deleted folder: XLV
[✓] Cleaned 4 items from assets/

================================================================================
STEP 1: SCRAPING FRESH DATA
================================================================================
[i] Running Barchart Screener...
...
```

---

## למה זה חשוב?

### 1. **מונע בלבול**
- אין דוחות ישנים
- תמיד רואים נתונים טריים

### 2. **חוסך מקום**
- מוחק CSV ישנים שלא בשימוש
- מוחק HTML ישנים

### 3. **מבטיח עקביות**
- כל הרצה מתחילה נקייה
- אין שאריות מהרצות קודמות

---

## אם לא רוצה ניקוי אוטומטי

### אופציה 1: דלג על הסקריפט
הרץ Screener ישירות:
```bash
cd scraper-ts
npm run screener
```

ואז עבד עם CSV ידנית.

### אופציה 2: הוסף דגל `--no-clean`

אם תרצה, אני יכול להוסיף דגל `--no-clean` ש:
- מדלג על STEP 0
- שומר נתונים ישנים

**האם תרצה שאוסיף את זה?**

---

## מיקום בקוד

**קובץ:** `csv_united.py`  
**פונקציה:** `scrape_and_process_all()`  
**שורות:** 1200-1239 (לפני STEP 1)

---

## סיכום

✅ כל הרצה של `python csv_united.py` מנקה את `assets/` אוטומטית  
✅ תיקיית `bac/` נשמרת (backup)  
✅ ההרצה מתחילה נקייה עם נתונים טריים  
✅ אין צורך למחוק ידנית יותר!

---

**תאריך עדכון:** 30 יולי 2026
