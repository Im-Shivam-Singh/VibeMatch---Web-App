import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  partyId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    partyId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique compound index: one review per user per party
ReviewSchema.index({ partyId: 1, userId: 1 }, { unique: true });

export const Review =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
