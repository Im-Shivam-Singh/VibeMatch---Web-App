import mongoose, { Schema, Document, Types } from 'mongoose';

// Embedded subdocument: GroupChatMember
export interface IGroupChatMember {
  userId: string;
  joinedAt: Date;
}

const GroupChatMemberSchema = new Schema<IGroupChatMember>(
  {
    userId: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: true }
);

// Embedded subdocument: GroupChatMessage
export interface IGroupChatMessage {
  senderId: string;
  content: string;
  kind: string;
  offerBrand?: string;
  createdAt: Date;
}

const GroupChatMessageSchema = new Schema<IGroupChatMessage>(
  {
    senderId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    kind: {
      type: String,
      default: 'text',
      enum: ['text', 'system', 'offer'],
    },
    offerBrand: {
      type: String,
      enum: [
        'swiggy',
        'zomato',
        'blinkit',
        'zepto',
        'bigbasket',
        'instamart',
        'flipkart',
      ],
    },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

// Main GroupChat document
export interface IGroupChat extends Document {
  partyId: string;
  members: Types.DocumentArray<IGroupChatMember>;
  messages: Types.DocumentArray<IGroupChatMessage>;
  createdAt: Date;
  updatedAt: Date;
}

const GroupChatSchema = new Schema<IGroupChat>(
  {
    partyId: {
      type: String,
      required: true,
      unique: true,
    },
    members: {
      type: [GroupChatMemberSchema],
      default: [],
    },
    messages: {
      type: [GroupChatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (partyId already has unique:true in schema)

// Virtual: member count
GroupChatSchema.virtual('memberCount').get(function (this: IGroupChat) {
  return this.members.length;
});

// Ensure virtual fields are serialized
GroupChatSchema.set('toJSON', { virtuals: true });
GroupChatSchema.set('toObject', { virtuals: true });

export const GroupChat =
  mongoose.models.GroupChat ||
  mongoose.model<IGroupChat>('GroupChat', GroupChatSchema);

export default GroupChat;
