import mongoose from 'mongoose';
import { Holiday } from '../src/models';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrateHolidayDates() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all holidays
    const holidays = await Holiday.find({}).lean();
    console.log(`📅 Found ${holidays.length} holidays to check\n`);

    if (holidays.length === 0) {
      console.log('ℹ️  No holidays found in database. Migration not needed.');
      process.exit(0);
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const holiday of holidays) {
      // Check if date is a Date object (old format)
      if (holiday.date instanceof Date) {
        // Convert Date to YYYY-MM-DD string in local timezone
        const dateObj = holiday.date;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Update the holiday
        await Holiday.updateOne(
          { _id: holiday._id },
          { $set: { date: dateString } }
        );

        console.log(`✅ Migrated: ${holiday.name}`);
        console.log(`   From: ${dateObj.toISOString()}`);
        console.log(`   To:   ${dateString}\n`);
        migratedCount++;
      } else if (typeof holiday.date === 'string') {
        console.log(`⏭️  Skipped: ${holiday.name} - already string format (${holiday.date})`);
        skippedCount++;
      } else {
        console.log(`⚠️  Warning: ${holiday.name} - unexpected date format:`, typeof holiday.date);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} holidays`);
    console.log(`   ⏭️  Skipped:  ${skippedCount} holidays (already correct format)`);
    console.log('='.repeat(50));

    if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('ℹ️  You can now restart your application.');
    } else {
      console.log('\nℹ️  No migration needed - all holidays already use string format.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run migration
console.log('🔧 Holiday Date Migration Script');
console.log('='.repeat(50));
console.log('This script converts Date objects to YYYY-MM-DD strings\n');

migrateHolidayDates();
