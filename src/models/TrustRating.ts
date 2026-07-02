import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustRating extends Document {
  partyId: string;
  hostId: string;
  guestId: string;
  rating: number;
  note: string;
  createdAt: Date;
}

const TrustRatingSchema = new Schema<ITrustRating>(
  {
    partyId: {
      type: String,
      required: true,
    },
    hostId: {
      type: String,
      required: true,
    },
    guestId: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique compound index: one trust rating per guest per party
TrustRatingSchema.index({ partyId: 1, guestId: 1 }, { unique: true });
TrustRatingSchema.index({ guestId: 1 });

export const TrustRating =
  mongoose.models.TrustRating ||
  mongoose.model<ITrustRating>('TrustRating', TrustRatingSchema);

export default TrustRating;
