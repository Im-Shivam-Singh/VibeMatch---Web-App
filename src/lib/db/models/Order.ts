import mongoose, { Schema, Document, Types } from 'mongoose';

// Embedded subdocument for order items
export interface IOrderItem {
  menuItemId?: string;
  name: string;
  emoji: string;
  unitPrice: number;
  quantity: number;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: String,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: '🎟️',
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

export interface IOrder extends Document {
  userId: string;
  partyId: string;
  totalAmount: number;
  currency: string;
  status: string;
  stripePaymentId?: string;
  items: Types.DocumentArray<IOrderItem>;
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: String,
      required: true,
    },
    partyId: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: '£',
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'paid', 'refunded'],
    },
    stripePaymentId: {
      type: String,
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
OrderSchema.index({ userId: 1 }); // User orders
OrderSchema.index({ partyId: 1 }); // Party orders
OrderSchema.index({ partyId: 1, status: 1 }); // Pending orders per party

export const Order =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
