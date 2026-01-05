import { Schedule, Availability } from '../models';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function removeSaturdayData() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to database');

    // 1. Remove day "6" from all schedules
    const schedules = await Schedule.find({});
    let schedulesUpdated = 0;

    for (const schedule of schedules) {
      let modified = false;

      // Remove day "6" from assignments
      if (schedule.assignments && '6' in schedule.assignments) {
        const assignmentsObj = schedule.assignments as any;
        delete assignmentsObj['6'];
        schedule.markModified('assignments');
        modified = true;
      }

      // Remove day "6" from lockedAssignments
      if (schedule.lockedAssignments && '6' in schedule.lockedAssignments) {
        const lockedObj = schedule.lockedAssignments as any;
        delete lockedObj['6'];
        schedule.markModified('lockedAssignments');
        modified = true;
      }

      if (modified) {
        await schedule.save();
        schedulesUpdated++;
      }
    }

    console.log(`✓ Updated ${schedulesUpdated} schedules (removed day 6)`);

    // 2. Remove day "6" from all availabilities
    const availabilities = await Availability.find({});
    let availabilitiesUpdated = 0;

    for (const availability of availabilities) {
      // Remove day "6" from shifts
      if (availability.shifts && '6' in availability.shifts) {
        const shiftsObj = availability.shifts as any;
        delete shiftsObj['6'];
        availability.markModified('shifts');
        await availability.save();
        availabilitiesUpdated++;
      }
    }

    console.log(`✓ Updated ${availabilitiesUpdated} availabilities (removed day 6)`);
    console.log('✓ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

removeSaturdayData();
