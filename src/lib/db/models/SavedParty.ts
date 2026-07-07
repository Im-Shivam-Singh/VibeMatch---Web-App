import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedParty extends Document {
  userId: string;
  partyId: string;
  createdAt: Date;
}

const SavedPartySchema = new Schema<ISavedParty>(
  {
    userId: {
      type: String,
      required: true,
    },
    partyId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique compound index: one save per user per party
SavedPartySchema.index({ userId: 1, partyId: 1 }, { unique: true });

export const SavedParty =
  mongoose.models.SavedParty ||
  mongoose.model<ISavedParty>('SavedParty', SavedPartySchema);

export default SavedParty;
