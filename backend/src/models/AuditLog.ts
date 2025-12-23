import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'CREATE_SCHEDULE'
  | 'UPDATE_SCHEDULE'
  | 'DELETE_SCHEDULE'
  | 'PUBLISH_SCHEDULE'
  | 'LOCK_SHIFT'
  | 'UNLOCK_SHIFT'
  | 'CREATE_AVAILABILITY'
  | 'UPDATE_AVAILABILITY'
  | 'DELETE_AVAILABILITY'
  | 'CREATE_VACATION'
  | 'DELETE_VACATION'
  | 'UPDATE_EMPLOYEE'
  | 'TOGGLE_EMPLOYEE_ACTIVE'
  | 'CREATE_HOLIDAY'
  | 'UPDATE_HOLIDAY'
  | 'DELETE_HOLIDAY'
  | 'LOGIN'
  | 'LOGOUT';

export type EntityType =
  | 'schedule'
  | 'availability'
  | 'vacation'
  | 'holiday'
  | 'employee'
  | 'auth';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: AuditAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
    },
    entityType: {
      type: String,
      enum: ['schedule', 'availability', 'vacation', 'holiday', 'employee', 'auth'],
      required: [true, 'Entity type is required'],
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // We use custom timestamp field
  }
);

// Indexes for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
