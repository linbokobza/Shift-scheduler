const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function fixVacationDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler');
    console.log('Connected to MongoDB');

    // Get the Vacation model
    const vacationSchema = new mongoose.Schema({
      employeeId: mongoose.Schema.Types.ObjectId,
      date: Date,
      type: String,
      createdAt: Date,
      updatedAt: Date,
    });

    const Vacation = mongoose.model('Vacation', vacationSchema);

    // Find all vacations where the date looks off by one day
    const vacations = await Vacation.find({});
    console.log(`Found ${vacations.length} total vacation records`);

    let fixedCount = 0;

    for (const vacation of vacations) {
      const originalDate = new Date(vacation.date);
      const dateStr = originalDate.toISOString().split('T')[0];

      // Check if this was likely created with the buggy code
      // The bug would store the date off by -1 in UTC
      // So we need to add 1 day to fix it
      const fixedDate = new Date(originalDate);
      fixedDate.setDate(fixedDate.getDate() + 1);

      const fixedDateStr = fixedDate.toISOString().split('T')[0];

      console.log(`Checking vacation: ${dateStr} → ${fixedDateStr}`);

      // Only fix if it looks like it was created by the buggy code
      // (this is a heuristic - you may need to adjust based on your timezone)
      if (originalDate.getHours() === 23 && originalDate.getMinutes() === 0) {
        // This looks like a UTC date that should be local
        vacation.date = fixedDate;
        await vacation.save();
        fixedCount++;
        console.log(`  ✓ Fixed!`);
      }
    }

    console.log(`\nFixed ${fixedCount} vacation records`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixVacationDates();
