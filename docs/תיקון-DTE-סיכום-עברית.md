# תיקון בעיית DTE (Days To Expiration) - DACS 3.0

## תיאור הבעיה
המערכת הציעה עסקאות שבהן ה-**SHORT LEG פוקע תוך פחות מ-3 ימים**, בניגוד לכללי DACS-3.0.

### הדוגמה שהצגת
**ביום 30-07-2026**, המערכת הציעה:

| רגל | תאריך פקיעה | DTE | סטטוס |
|-----|-------------|-----|--------|
| **Short Leg** | 07-31 (מחר!) | 1 יום | ❌ **לא תקין** |
| **Long Leg** | 08-07 | 8 ימים | ✅ תקין |

**הכללים של DACS-3.0:**
- SHORT LEG חייב להיות עם DTE בין **3 ל-7 ימים**
- LONG LEG חייב להיות **+7 ימים** מה-SHORT LEG

---

## מה תוקן?

### 1. הוספת סינון DTE ברמת Python
**קובץ: `csv_united.py`**

#### הוספנו קבוע חדש:
```python
MIN_DTE_DAYS_SHORT_LEG = 3  # מינימום DTE עבור Short Leg
```

#### הוספנו 2 פונקציות חדשות:
```python
def _parse_expiration_date(exp_date_str):
    """מפענח תאריך פקיעה מהפורמט של CBOE"""
    # דוגמה: 'Fri Jul 31 2026' -> datetime object

def _calculate_dte(exp_date_str):
    """מחשב כמה ימים עד תאריך הפקיעה"""
    # מחזיר: מספר ימים מהיום עד תאריך הפקיעה
```

#### עדכנו את `_filter_rows()`:
הוספנו בדיקה שמסננת תאריכים עם DTE < 3:

```python
dte = _calculate_dte(exp_date)
if dte is not None and dte < MIN_DTE_DAYS_SHORT_LEG:
    print(f'  [FILTERED] Skipping {exp_date} (DTE={dte} days, minimum required: 3 days)')
    continue  # דלג על כל השורות של תאריך זה
```

**חשוב:** הסינון מסיר רק תאריכים עם DTE < 3, אבל **שומר** תאריכים עם DTE > 7 (כי הם יכולים להיות LONG LEG).

---

### 2. חיזוק ההוראות ל-Gemini
**קובץ: `csv_united.py` - פונקציה `send_to_gem()`**

הוספנו ל-Prompt שנשלח ל-Gemini:

```python
TODAY'S DATE: {today_str}  # למשל: "July 30, 2026"

CRITICAL DTE VALIDATION (MUST FOLLOW):
- לפני בחירת SHORT LEG, חשב את ה-DTE שלו
- SHORT LEG חייב להיות עם DTE בין 3 ל-7 ימים
- דחה כל SHORT LEG עם DTE < 3 או DTE > 7

דוגמאות לוולידציה (היום: July 30, 2026):
  * July 31, 2026 (DTE=1): ❌ INVALID - קרוב מדי
  * August 1, 2026 (DTE=2): ❌ INVALID - קרוב מדי
  * August 2, 2026 (DTE=3): ✅ VALID - מינימום
  * August 5, 2026 (DTE=6): ✅ VALID
  * August 6, 2026 (DTE=7): ✅ VALID - מקסימום
  * August 7, 2026 (DTE=8): ❌ INVALID לShort, אבל ✅ VALID לLong
```

---

### 3. עדכון קבצי ההוראות
**קובץ: `agent-docs/אנגלית-כללי מסחר DACS-3.0 עבור AGENT.txt`**

הוספנו סעיף מפורט עם דוגמאות:

```
## Step 2: Short Leg Selection (CRITICAL - DTE VALIDATION REQUIRED)

- CRITICAL: חובה לחשב את ה-DTE לפני בחירת Short Leg
- CRITICAL: לדחות כל Short Leg עם DTE < 3 או DTE > 7

דוגמאות (היום: July 30, 2026):
  * July 31 (DTE=1) = ❌ INVALID
  * August 2 (DTE=3) = ✅ VALID (minimum)
  * August 6 (DTE=7) = ✅ VALID (maximum)
  * August 7 (DTE=8) = ❌ INVALID for Short Leg
```

**קובץ: `agent-docs/csv file filter.txt`**

הוספנו כלל סינון מפורש:

```
## 2. Extract All Expiration Dates & Apply DTE Filter

- CRITICAL DTE FILTER: להסיר תאריכי פקיעה עם DTE < 3 ימים
- לשמור תאריכים עם DTE >= 3 (יכולים להיות Short או Long Leg)
```

---

## אימות התיקון

### תוצאות הרצה
```bash
$ python csv_united.py --merge-only

=== Step 1: Merging CSV files for XLV ===
  [FILTERED] Skipping Fri Jul 31 2026 (DTE=1 days, minimum required: 3 days)
[OK] Merged CSV created: assets\XLV\merged_filtered_options.csv
```

### השוואת קבצי CSV

**לפני התיקון:**
```csv
Expiration Date,Expected Move,Calls,...
Fri Jul 31 2026,$5.13,XLV260731C00169000,...  ← DTE=1 ❌
Fri Aug 07 2026,$4.96,XLV260807C00171000,...
```

**אחרי התיקון:**
```csv
Expiration Date,Expected Move,Calls,...
Fri Aug 07 2026,$4.96,XLV260807C00171000,...  ← מתחיל מכאן ✅
Fri Aug 14 2026,$4.48,XLV260814C00172000,...
```

---

## 3 שכבות הגנה

התיקון יוצר 3 שכבות הגנה נגד בחירת SHORT LEG לא תקין:

### שכבה 1: סינון ב-Python
- **קובץ:** `csv_united.py`
- **תפקיד:** מסנן תאריכים עם DTE < 3 **לפני** שליחה ל-Gemini
- **יתרון:** Gemini לא רואה בכלל אופציות שלא תקינות

### שכבה 2: Prompt חכם
- **קובץ:** `csv_united.py` (פונקציה `send_to_gem()`)
- **תפקיד:** מעביר תאריך נוכחי + הוראות מפורשות ל-Gemini
- **יתרון:** Gemini יודע בדיוק מה התאריך של היום ויכול לחשב DTE בעצמו

### שכבה 3: תיעוד מפורט
- **קבצים:** `agent-docs/*.txt`
- **תפקיד:** מכיל כללים מפורטים עם דוגמאות מספריות
- **יתרון:** משמש כ"חוקה" למערכת - כל שינוי עתידי יתבסס על זה

---

## סיכום

✅ **תאריכים עם DTE < 3 יסוננו אוטומטית** בשלב המיזוג  
✅ **Gemini מקבל הוראות ברורות** עם תאריך היום  
✅ **הכללים מתועדים בצורה ברורה** בקבצי ההוראות  
✅ **המערכת מדפיסה הודעות log** על תאריכים שסוננו  

---

## קבצים שהשתנו

| קובץ | סוג שינוי |
|------|-----------|
| `csv_united.py` | הוספת לוגיקת סינון DTE + עדכון Prompt |
| `agent-docs/אנגלית-כללי מסחר DACS-3.0 עבור AGENT.txt` | הוספת דוגמאות והדגשות |
| `agent-docs/csv file filter.txt` | הוספת כלל סינון DTE |
| `DTE_FILTER_FIX.md` | תיעוד טכני (אנגלית) |
| `תיקון-DTE-סיכום-עברית.md` | תיעוד זה |

---

**תאריך התיקון:** 30 יולי 2026  
**גרסה:** DACS 3.0  
**סטטוס:** ✅ תוקן ונבדק
