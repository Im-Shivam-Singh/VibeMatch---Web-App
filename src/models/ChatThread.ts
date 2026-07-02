import mongoose, { Schema, Document } from 'mongoose';

export interface IChatThread extends Document {
  userAId: string;
  userBId: string;
  partyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatThreadSchema = new Schema<IChatThread>(
  {
    userAId: {
      type: String,
      required: true,
    },
    userBId: {
      type: String,
      required: true,
    },
    partyId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to find threads between two users
ChatThreadSchema.index({ userAId: 1, userBId: 1 });

export const ChatThread =
  mongoose.models.ChatThread ||
  mongoose.model<IChatThread>('ChatThread', ChatThreadSchema);

export default ChatThread;
