import mongoose, { Schema, Document } from 'mongoose';

export interface IPartyView extends Document {
  partyId: string;
  userId?: string;
  createdAt: Date;
}

const PartyViewSchema = new Schema<IPartyView>(
  {
    partyId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
PartyViewSchema.index({ partyId: 1 });
PartyViewSchema.index({ partyId: 1, createdAt: -1 }); // View analytics per party

export const PartyView =
  mongoose.models.PartyView ||
  mongoose.model<IPartyView>('PartyView', PartyViewSchema);

export default PartyView;
