import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  orderId: string;
  userId: string;
  partyId: string;
  qrHash: string;
  scannedAt?: Date;
  scannedById?: string;
  createdAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    partyId: {
      type: String,
      required: true,
    },
    qrHash: {
      type: String,
      required: true,
      unique: true,
    },
    scannedAt: {
      type: Date,
    },
    scannedById: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
TicketSchema.index({ orderId: 1 }, { unique: true });
TicketSchema.index({ qrHash: 1 }, { unique: true });
TicketSchema.index({ userId: 1 });
TicketSchema.index({ partyId: 1 });

export const Ticket =
  mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
