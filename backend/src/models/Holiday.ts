import mongoose, { Document, Schema } from 'mongoose';

export interface IHoliday extends Document {
  _id: mongoose.Types.ObjectId;
  date: string; // Changed from Date to string (YYYY-MM-DD format)
  name: string;
  type: 'no-work' | 'morning-only';
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    date: {
      type: String,
      required: [true, 'Date is required'],
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['no-work', 'morning-only'],
      required: [true, 'Holiday type is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Note: date field already has unique: true which creates an index automatically
// No need for additional index here

export const Holiday = mongoose.model<IHoliday>('Holiday', holidaySchema);
