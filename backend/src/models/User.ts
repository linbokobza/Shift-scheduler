import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'manager';
  isActive: boolean;
  colorIndex: number;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function(password: string) {
          // Require at least 1 uppercase, 1 lowercase, and 1 digit
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
        },
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 digit'
      },
      select: false, // Don't include password by default in queries
    },
    role: {
      type: String,
      enum: ['employee', 'manager'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Assigned once at creation time and never changed afterwards, so each
    // employee's color in the UI stays fixed regardless of how many other
    // employees are added, removed, or toggled active/inactive.
    colorIndex: {
      type: Number,
      required: true,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Assign a permanent, never-reused colorIndex to new users via an atomic counter,
// so concurrent signups can't race each other into picking the same index.
const Counter = mongoose.models.Counter || mongoose.model(
  'Counter',
  new Schema({ _id: String, seq: { type: Number, default: 0 } })
);

userSchema.pre('validate', async function (next) {
  if (this.isNew && this.colorIndex === undefined) {
    const counter = await Counter.findByIdAndUpdate(
      'userColorIndex',
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.colorIndex = counter.seq - 1;
  }
  next();
});

// Hash password and record change timestamp before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // Only set on updates, not initial creation
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
