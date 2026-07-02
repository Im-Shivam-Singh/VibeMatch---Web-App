import mongoose, { Schema, Document } from 'mongoose';

export interface IPartyMedia extends Document {
  partyId: string;
  url: string;
  type: string;
  caption: string;
  position: number;
  createdAt: Date;
}

const PartyMediaSchema = new Schema<IPartyMedia>(
  {
    partyId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'image',
      enum: ['image', 'video'],
    },
    caption: {
      type: String,
      default: '',
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
PartyMediaSchema.index({ partyId: 1 });

export const PartyMedia =
  mongoose.models.PartyMedia ||
  mongoose.model<IPartyMedia>('PartyMedia', PartyMediaSchema);

export default PartyMedia;
