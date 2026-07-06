import mongoose, { Schema, Document } from 'mongoose';

export interface IParty extends Document {
  title: string;
  city: string;
  area: string;
  date: string;
  time: string;
  fee: number;
  maxGuests: number;
  vibes: string;
  description: string;
  hostName: string;
  hostId?: string;
  coverUrl?: string;
  lat?: number;
  lng?: number;
  guestCount: number;
  approvalRequired: boolean;
  acceptJoiners: boolean;
  menuOpen: boolean;
  securityBooked: boolean;
  securityFee: number;
  securityStatus: string;
  locationRevealAt?: Date;
  groupChatEnabled: boolean;
  spotifyPlaylistUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PartySchema = new Schema<IParty>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxGuests: {
      type: Number,
      default: 10,
      min: 1,
    },
    vibes: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    hostName: {
      type: String,
      required: true,
      trim: true,
    },
    hostId: {
      type: String,
    },
    coverUrl: {
      type: String,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    guestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    approvalRequired: {
      type: Boolean,
      default: true,
    },
    acceptJoiners: {
      type: Boolean,
      default: true,
    },
    menuOpen: {
      type: Boolean,
      default: true,
    },
    securityBooked: {
      type: Boolean,
      default: false,
    },
    securityFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    securityStatus: {
      type: String,
      default: '',
      enum: ['', 'requested', 'confirmed', 'completed'],
    },
    locationRevealAt: {
      type: Date,
    },
    groupChatEnabled: {
      type: Boolean,
      default: false,
    },
    spotifyPlaylistUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PartySchema.index({ city: 1 });
PartySchema.index({ hostId: 1 });
PartySchema.index({ date: 1 });
PartySchema.index({ city: 1, date: 1 }); // City-based date filtering (common query)
PartySchema.index({ hostId: 1, createdAt: -1 }); // Host party list sorted by creation

export const Party =
  mongoose.models.Party || mongoose.model<IParty>('Party', PartySchema);

export default Party;
