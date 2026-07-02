import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  partyId: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
  createdAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    partyId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    emoji: {
      type: String,
      default: '🍹',
    },
    category: {
      type: String,
      default: 'drink',
      enum: ['drink', 'snack', 'soft'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
MenuItemSchema.index({ partyId: 1 });

export const MenuItem =
  mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export default MenuItem;
