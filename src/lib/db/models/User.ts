import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  profession?: string;
  instagram?: string;
  vibePrefs: string;
  vibes: number;
  hosted: number;
  rating: number;
  ratingCount: number;
  trustScore: number;
  trustCount: number;
  blocked: string;
  role: 'host' | 'partier';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
    },
    city: {
      type: String,
      trim: true,
    },
    profession: {
      type: String,
      trim: true,
    },
    instagram: {
      type: String,
      trim: true,
    },
    vibePrefs: {
      type: String,
      default: '',
    },
    vibes: {
      type: Number,
      default: 0,
      min: 0,
    },
    hosted: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    trustScore: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    trustCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    blocked: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['host', 'partier'],
      default: 'partier',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (phone and username already have unique:true in the schema above,
// so we only add compound indexes or additional ones here)
UserSchema.index({ city: 1 }); // Location-based user queries
UserSchema.index({ role: 1 }); // Host/partier filtering

// Virtual for blocked user IDs array
UserSchema.virtual('blockedIds').get(function (this: IUser) {
  if (!this.blocked) return [];
  return this.blocked.split(',').filter(Boolean);
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
