import mongoose, { Document, Schema } from 'mongoose';

export interface IVacation extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  type: 'vacation' | 'sick';
  createdAt: Date;
  updatedAt: Date;
}

const vacationSchema = new Schema<IVacation>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    type: {
      type: String,
      enum: ['vacation', 'sick'],
      default: 'vacation',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
vacationSchema.index({ employeeId: 1, date: 1 });
// Note: Removed duplicate date index as it's already covered by the compound index above

export const Vacation = mongoose.model<IVacation>('Vacation', vacationSchema);
