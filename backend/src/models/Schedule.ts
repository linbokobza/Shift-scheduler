import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule extends Document {
  _id: mongoose.Types.ObjectId;
  weekStart: Date;
  assignments: {
    [day: string]: {
      [shiftId: string]: mongoose.Types.ObjectId | null;
    };
  };
  lockedAssignments?: {
    [day: string]: {
      [shiftId: string]: boolean;
    };
  };
  frozenAssignments?: {
    [day: string]: {
      [shiftId: string]: boolean;
    };
  };
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  optimizationScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    weekStart: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    assignments: {
      type: Map,
      of: {
        type: Map,
        of: Schema.Types.Mixed, // ObjectId or null
      },
      required: true,
    },
    lockedAssignments: {
      type: Map,
      of: {
        type: Map,
        of: Boolean,
      },
    },
    frozenAssignments: {
      type: Map,
      of: {
        type: Map,
        of: Boolean,
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
    optimizationScore: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
scheduleSchema.index({ weekStart: 1 });
scheduleSchema.index({ createdBy: 1 });
scheduleSchema.index({ isPublished: 1, weekStart: 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
