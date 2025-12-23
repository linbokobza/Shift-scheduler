# 🧪 מדריך בדיקה לאלגוריתם OR-Tools

## ✅ שלב 1: וידוא שהכל מותקן

### בדיקת Python ו-OR-Tools
```bash
python --version
# צריך להציג: Python 3.8 ומעלה

python -c "import ortools; print('OR-Tools version:', ortools.__version__)"
# צריך להציג: OR-Tools version: 9.14.x (ללא שגיאות)
```

אם יש שגיאה, הרץ:
```bash
cd backend/scripts
pip install -r requirements.txt
```

---

## ✅ שלב 2: בדיקת הסולבר Python (בודד)

הרץ בדיקה עם נתוני דמה:
```bash
cd backend/scripts
cat test_solver.json | python optimize_schedule.py
```

**תוצאה מצופה:**
```json
{
  "success": true,
  "result": {
    "assignments": {
      "0": { "morning": "emp1", "evening": "emp2", ... },
      ...
    },
    "stats": {
      "objective_value": 0.0,
      "unfilled_shifts": 0,
      "solve_time_seconds": 0.038
    }
  }
}
```

אם זה עובד - הסולבר Python תקין! ✅

---

## ✅ שלב 3: הפעלת הבקאנד

### הפעלת שרת הבקאנד:
```bash
cd backend
npm install
npm run dev
```

צריך לראות:
```
Server running on port 5000
Connected to MongoDB
```

---

## ✅ שלב 4: הפעלת הפרונטאנד

בטרמינל **נפרד**:
```bash
cd project  # התיקייה הראשית
npm install
npm run dev
```

צריך לראות:
```
VITE ready in Xms
Local: http://localhost:5173
```

---

## ✅ שלב 5: בדיקת האינטגרציה המלאה

1. **פתח את הדפדפן**: `http://localhost:5173`

2. **התחבר כמנהל**:
   - Email: `manager@example.com`
   - Password: `password`

3. **היכנס לדף המנהל**

4. **בדוק שיש עובדים פעילים** (לפחות 3)

5. **בחר שבוע** ולחץ על **"צור סידור"**

6. **פתח Console בדפדפן** (F12):
   - צריך לראות: `🚀 Calling OR-Tools backend API to generate schedule...`
   - אחרי כמה שניות: `✅ OR-Tools API response: {...}`

7. **הסידור אמור להופיע אוטומטית** בטבלה למטה!

---

## 🔍 פתרון בעיות נפוצות

### בעיה: "Failed to start Python process"
**פתרון:**
```bash
# ודא ש-Python בנתיב
python --version

# אם לא עובד, הוסף ל-PATH או ערוך את ortoolsSolver.ts:
const python = spawn('python3', [scriptPath]);  // במקום 'python'
```

### בעיה: "Module 'ortools' not found"
**פתרון:**
```bash
cd backend/scripts
pip install ortools
```

### בעיה: "API call failed: 401"
**פתרון:**
- התנתק והתחבר שוב (כדי לרענן את ה-token)
- ודא שאתה מחובר כמנהל (manager)

### בעיה: הסידור לא מופיע אחרי "צור סידור"
**פתרון:**
1. פתח Console (F12) וחפש שגיאות
2. ודא שהשרת רץ ב-`http://localhost:5000`
3. בדוק שיש לפחות 3 עובדים פעילים עם זמינויות

---

## 📊 איך לדעת שזה עובד?

**סימנים לאלגוריתם מוצלח:**

1. ✅ **זמן יצירה מהיר**: 50-200ms (במקום 2+ שניות)
2. ✅ **אזהרות מדויקות**: "העובד X קיבל משמרת 8-8"
3. ✅ **הוגנות מושלמת**: כל העובדים עם אותו מספר משמרות (±1)
4. ✅ **אין משמרות ריקות**: כל משמרת מאוישת (אם יש עובד זמין)
5. ✅ **Console log**: צריך לראות `[OR-Tools] Solver succeeded!`

---

## 🎯 בדיקת תרחישי קצה

### בדיקה 1: זמינויות מינימליות
- הגדר שכל עובד זמין רק ל-3 משמרות
- לחץ "צור סידור"
- **תוצאה מצופה**: הסידור נוצר בהצלחה, אזהרות על "3 משמרות בלבד"

### בדיקה 2: חוסר זמינות
- הגדר שאף עובד לא זמין ביום ראשון בבוקר
- לחץ "צור סידור"
- **תוצאה מצופה**: אזהרה "משמרת נותרה ללא שיבוץ"

### בדיקה 3: עובד אחד עם בוקר אחד
- הגדר עובד אחד שזמין **רק** לבוקר אחד
- לחץ "צור סידור"
- **תוצאה מצופה**: העובד מקבל בדיוק את הבוקר הזה

---

## 🚀 כל מה שעובד = הכל מוכן!

אם עברת את כל הבדיקות - האלגוריתם שלך עובד מצוין! 🎉
