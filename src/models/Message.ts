import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  kind: string;
  mediaUrl?: string;
  requestId?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    threadId: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    receiverId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    kind: {
      type: String,
      default: 'text',
      enum: ['text', 'video', 'system', 'payment'],
    },
    mediaUrl: {
      type: String,
    },
    requestId: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
