# תיקון סינון DTE (Days To Expiration) - DACS 3.0

## תיאור הבעיה
המערכת החזירה עסקאות שבהן ה-SHORT LEG פוקע תוך פחות מ-3 ימים, בניגוד לכללי DACS-3.0 שדורשים **DTE בין 3 ל-7 ימים** עבור SHORT LEG.

### דוגמה לבעיה
ביום 30-07-2026, המערכת הציעה עסקה עם:
- **Short Leg**: Fri Jul 31 2026 (DTE=1 יום) ❌ **לא תקין**
- **Long Leg**: Fri Aug 07 2026 (DTE=8 ימים) ✅ תקין

## הפתרון שיושם

### 1. שינויים ב-`csv_united.py`

#### הוספת קבועים חדשים (שורות 52-57)
```python
MIN_DTE_DAYS_SHORT_LEG = 3  # Minimum Days To Expiration for Short Leg (DACS-3.0 rule)
                            # Filter out expirations < 3 days since they cannot be used as Short Leg
```

#### הוספת פונקציות חישוב DTE (אחרי שורה 117)
```python
def _parse_expiration_date(exp_date_str):
    """Parse expiration date string and return datetime object."""
    # Parses formats like 'Fri Jul 31 2026'
    ...

def _calculate_dte(exp_date_str):
    """Calculate Days To Expiration from expiration date string."""
    # Returns number of days from today to expiration
    ...
```

#### עדכון `_filter_rows` - הוספת סינון DTE (שורות 226-235)
```python
# Check DTE (Days To Expiration) - filter out expirations that are too soon for Short Leg
# We only filter out DTE < MIN_DTE_DAYS_SHORT_LEG (too soon to be a Short Leg)
# We keep longer DTE dates since they can be used as Long Leg (+7 days from Short)
dte = _calculate_dte(exp_date)
if dte is not None and dte < MIN_DTE_DAYS_SHORT_LEG:
    # Skip this expiration date - it's too soon (cannot be used as Short Leg)
    print(f'  [FILTERED] Skipping {exp_date} (DTE={dte} days, minimum required: {MIN_DTE_DAYS_SHORT_LEG} days)')
    continue
```

**הערה חשובה:** הסינון מסיר רק תאריכים עם DTE < 3, אבל **לא** מסנן תאריכים עם DTE > 7, כי אלה יכולים לשמש כ-LONG LEG.

#### עדכון ה-Prompt ל-Gemini (שורות 1026-1049)
```python
TODAY'S DATE: {today_str}

CRITICAL DTE VALIDATION (MUST FOLLOW):
- Before selecting any Short Leg, calculate its Days To Expiration (DTE)
- Short Leg DTE MUST be between 3 to 7 days (inclusive)
- REJECT any Short Leg with DTE < 3 or DTE > 7
- Example validation for today ({today_str}):
  * If expiration is tomorrow (DTE=1 or 2): INVALID - too soon
  * If expiration is 3-7 days away: VALID for Short Leg
  * If expiration is 8+ days away: INVALID for Short Leg (but valid for Long Leg)
```

### 2. שינויים בקבצי הוראות (agent-docs)

#### `אנגלית-כללי מסחר DACS-3.0 עבור AGENT.txt`
הוספת הדגשה ודוגמאות מפורטות לכלל DTE:

```
## Step 2: Short Leg Selection (CRITICAL - DTE VALIDATION REQUIRED)
- Expiration: Weekly expiration only (the upcoming Friday). Days to Expiration (DTE) must be between 3 to 7 days.
  - CRITICAL: You MUST calculate the DTE for each potential Short Leg before selecting it.
  - CRITICAL: REJECT any Short Leg with DTE < 3 days or DTE > 7 days.
  - If DTE = 3: Position must be opened on Tuesday.
  - If DTE = 4: Position must be opened on Monday.
  - Example: If today is July 30, 2026, then:
    * July 31, 2026 expiration (DTE=1) = INVALID (too soon)
    * August 1, 2026 expiration (DTE=2) = INVALID (too soon)
    * August 2, 2026 expiration (DTE=3) = VALID (minimum)
    * August 5, 2026 expiration (DTE=6) = VALID
    * August 6, 2026 expiration (DTE=7) = VALID (maximum)
    * August 7, 2026 expiration (DTE=8) = INVALID (too far for Short Leg, but valid for Long Leg)
```

#### `csv file filter.txt`
עדכון סעיף 2 להוסיף כלל סינון DTE:

```
## 2. Extract All Expiration Dates & Apply DTE Filter
- CRITICAL DTE FILTER: Remove entire expiration dates where Days To Expiration (DTE) < 3 days.
  * These dates cannot be used as Short Leg (DACS-3.0 requires Short Leg DTE between 3-7 days).
  * Keep all dates with DTE >= 3 days (they can be used as Short Leg or Long Leg).
```

## בדיקת התיקון

### תוצאות הרצה
```
=== Step 1: Merging CSV files for MSFT ===
  [FILTERED] Skipping Fri Jul 31 2026 (DTE=1 days, minimum required: 3 days)
[OK] Merged CSV created: assets\MSFT\merged_filtered_options.csv
```

### אימות הקובץ המסונן
לפני התיקון - הקובץ כלל:
```
Fri Jul 31 2026,$5.13,XLV260731C00169000,...  # DTE=1 ❌
```

אחרי התיקון - הקובץ מתחיל מ:
```
Fri Aug 07 2026,$4.96,XLV260807C00171000,...  # DTE=8 ✅
```

## שכבות ההגנה

התיקון יוצר 3 שכבות הגנה מפני בחירת SHORT LEG לא תקין:

1. **סינון Python (csv_united.py)**: מסיר תאריכים עם DTE < 3 מה-CSV לפני שליחה ל-Gemini
2. **Prompt ל-Gemini**: מפורש מציין את התאריך של היום ודורש אימות DTE
3. **קבצי הוראות (agent-docs)**: מכילים כללים מפורטים עם דוגמאות

## סיכום

התיקון מבטיח ש:
- ✅ אופציות עם DTE < 3 לא ישלחו כלל ל-Gemini
- ✅ Gemini מקבל הוראות ברורות לא לבחור SHORT LEG מחוץ לטווח 3-7 ימים
- ✅ הכללים מתועדים בצורה ברורה עם דוגמאות מספריות
- ✅ המערכת תדפיס הודעות סינון ברורות לקובץ ה-log

**תאריך התיקון:** 30 יולי 2026  
**קבצים שהשתנו:**
- `csv_united.py` (שינויים בשורות 52-57, 119-160, 226-235, 1026-1049)
- `agent-docs/אנגלית-כללי מסחר DACS-3.0 עבור AGENT.txt`
- `agent-docs/csv file filter.txt`
