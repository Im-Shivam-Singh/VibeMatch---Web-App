import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: 'message' | 'spot_request' | 'spot_accepted' | 'spot_rejected' | 'payment_received' | 'new_party_nearby' | 'review' | 'party_reminder';
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['message', 'spot_request', 'spot_accepted', 'spot_rejected', 'payment_received', 'new_party_nearby', 'review', 'party_reminder'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound index for fast "unread for user" queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
