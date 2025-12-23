import mongoose, { Document, Schema } from 'mongoose';

export interface IAvailabilityShift {
  status: 'available' | 'unavailable';
  comment?: string;
}

export interface IAvailability extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  weekStart: Date;
  shifts: {
    [day: string]: {
      [shiftId: string]: IAvailabilityShift;
    };
  };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const availabilityShiftSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const availabilitySchema = new Schema<IAvailability>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee ID is required'],
    },
    weekStart: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    shifts: {
      type: Map,
      of: {
        type: Map,
        of: availabilityShiftSchema,
      },
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
availabilitySchema.index({ employeeId: 1, weekStart: 1 }, { unique: true });
availabilitySchema.index({ weekStart: 1 });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);
