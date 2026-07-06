import mongoose, { Schema, Document } from 'mongoose';

export interface IJoinRequest extends Document {
  partyId: string;
  requesterName: string;
  introMessage: string;
  status: string;
  requesterId?: string;
  threadId?: string;
  introVideoUrl?: string;
  introVideoPoster?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    partyId: {
      type: String,
      required: true,
    },
    requesterName: {
      type: String,
      required: true,
      trim: true,
    },
    introMessage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'accepted', 'rejected'],
    },
    requesterId: {
      type: String,
    },
    threadId: {
      type: String,
    },
    introVideoUrl: {
      type: String,
    },
    introVideoPoster: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
JoinRequestSchema.index({ partyId: 1 }); // Party request list
JoinRequestSchema.index({ requesterId: 1 }); // User's request history
JoinRequestSchema.index({ partyId: 1, status: 1 }); // Pending requests per party

export const JoinRequest =
  mongoose.models.JoinRequest ||
  mongoose.model<IJoinRequest>('JoinRequest', JoinRequestSchema);

export default JoinRequest;
