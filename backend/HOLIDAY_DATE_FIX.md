# 🔧 תיקון תאריכי חגים - הסבר והנחיות

## 🎯 מה תוקן?

תוקנה בעיה שבה **חגים הופיעו ביום שגוי** (יום לפני או אחרי התאריך שנבחר).

### הבעיה המקורית:
- **Input**: מנהל בוחר תאריך 15.11.2024
- **Bug**: החג מופיע ב-14.11.2024 או 16.11.2024
- **סיבה**: המרות timezone בין Date objects

---

## ✅ הפתרון שיושם:

### שינוי מבני:
```typescript
// לפני:
date: Date  // MongoDB Date object (UTC timezone)

// אחרי:
date: string  // YYYY-MM-DD format (no timezone issues!)
```

---

## 📁 קבצים ששונו:

1. **Backend Model** - `backend/src/models/Holiday.ts`
   - `date` field שונה מ-`Date` ל-`String`
   - נוסף validation: `/^\d{4}-\d{2}-\d{2}$/`

2. **Backend Controller** - `backend/src/controllers/holiday.controller.ts`
   - הוסרו קריאות ל-`parseLocalDate()` ו-`formatDate()`
   - התאריך נשמר ומוחזר כ-string ישירות
   - נוסף validation לפורמט התאריך

3. **Frontend** - כבר עבד נכון!
   - `src/types/index.ts` כבר הגדיר `date: string`
   - `src/components/manager/HolidayManager.tsx` כבר שולח string
   - `src/utils/dateUtils.ts` - הפונקציות תומכות ב-string format

---

## ⚠️ חשוב - מיגרציה של חגים קיימים

אם יש לך **חגים קיימים** במסד הנתונים (MongoDB) מהגרסה הישנה, הם עדיין מאוחסנים כ-Date objects.

### אופציה 1: מחיקה ויצירה מחדש (מומלץ אם יש מעט חגים)

```bash
# התחבר ל-MongoDB
mongosh your-database-name

# מחק את כל החגים הקיימים
db.holidays.deleteMany({})

# עכשיו הוסף מחדש דרך הממשק
```

### אופציה 2: מיגרציה אוטומטית (אם יש הרבה חגים)

```javascript
// הרץ במ ongoDB shell או דרך סקריפט
db.holidays.find().forEach(function(holiday) {
  if (holiday.date instanceof Date) {
    // Convert Date to YYYY-MM-DD string
    const year = holiday.date.getFullYear();
    const month = String(holiday.date.getMonth() + 1).padStart(2, '0');
    const day = String(holiday.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    db.holidays.updateOne(
      { _id: holiday._id },
      { $set: { date: dateString } }
    );

    print(`Migrated holiday: ${holiday.name} from ${holiday.date} to ${dateString}`);
  }
});
```

### אופציה 3: סקריפט Node.js למיגרציה

צור קובץ `backend/scripts/migrate-holiday-dates.ts`:

```typescript
import { Holiday } from '../src/models';
import mongoose from 'mongoose';

async function migrateHolidayDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler');

    const holidays = await Holiday.find({});
    console.log(`Found ${holidays.length} holidays to migrate`);

    for (const holiday of holidays) {
      // Check if date is a Date object (old format)
      if (holiday.date instanceof Date) {
        const year = holiday.date.getFullYear();
        const month = String(holiday.date.getMonth() + 1).padStart(2, '0');
        const day = String(holiday.date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        await Holiday.updateOne(
          { _id: holiday._id },
          { $set: { date: dateString } }
        );

        console.log(`✅ Migrated: ${holiday.name} from ${holiday.date.toISOString()} to ${dateString}`);
      } else {
        console.log(`⏭️  Skipped: ${holiday.name} - already string format`);
      }
    }

    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateHolidayDates();
```

הרץ עם:
```bash
cd backend
ts-node scripts/migrate-holiday-dates.ts
```

---

## 🧪 בדיקת התיקון

### 1. מחק חגים קיימים (אם יש)
```bash
mongosh your-database
db.holidays.deleteMany({})
```

### 2. צור חג חדש דרך הממשק
- התחבר כמנהל
- לך ל"ניהול חגים"
- בחר תאריך: **19.11.2025**
- שם: "בדיקה"
- סוג: "חג - אין עבודה כלל"
- לחץ "הוסף חג"

### 3. ודא שהחג מופיע בדיוק ב-19.11
- בלוח השנה צריך להיות **19.11.2025**
- בסידור החג צריך לחסום את **19.11.2025** (לא 18.11 או 20.11!)

### 4. בדוק בקונסול Backend
```
📅 Loaded 1 holidays:
   2025-11-19: בדיקה - Type: no-work
```

התאריך צריך להיות **בדיוק כמו שהוזן**!

---

## 🎓 הסבר טכני

### למה Date objects גרמו לבעיה?

```javascript
// Frontend - ישראל (UTC+2)
const input = "2024-11-15"; // מהשדה date input

// Backend בשרת (לדוגמה UTC)
new Date("2024-11-15") // נפרש כ-UTC: 2024-11-15T00:00:00Z

// MongoDB מאחסן ב-UTC
stored: ISODate("2024-11-15T00:00:00Z")

// כשמציגים בישראל (UTC+2)
displayed: 2024-11-15T02:00:00+02:00
// אבל getDate() עלול להחזיר 14 או 16 תלוי במימוש!
```

### למה String format פותר את זה?

```javascript
// Frontend
const input = "2024-11-15";

// Backend
stored: "2024-11-15"  // בדיוק מה שנשלח!

// MongoDB
stored: "2024-11-15"  // שומר כ-string, אין המרה

// Display
displayed: "2024-11-15"  // בדיוק מה ששמורניק
```

**אין timezone → אין בעיה!** ✅

---

## 📚 מסמכים קשורים

- [`TROUBLESHOOTING.md`](scripts/TROUBLESHOOTING.md) - פתרון בעיות באלגוריתם
- [`Holiday.ts`](src/models/Holiday.ts) - המודל המעודכן
- [`holiday.controller.ts`](src/controllers/holiday.controller.ts) - הקונטרולר המעודכן

---

**תאריך עדכון:** נובמבר 2025
**גרסה:** 2.1 - תיקון timezone issues
