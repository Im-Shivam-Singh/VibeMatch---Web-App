# Task 1: MongoDB + Mongoose Setup — Work Record

## Summary
Set up MongoDB with Mongoose to replace Prisma/SQLite. Created the database connection module and all 14 Mongoose models based on the existing Prisma schema.

## Files Created

### 1. `src/lib/mongodb.ts` — MongoDB Connection
- Singleton pattern with global cache to avoid hot-reload reconnections in dev mode
- `connectDB()` function exported for use in API routes
- Mongoose instance also exported as default
- Reads `MONGODB_URI` from environment variable

### 2. Mongoose Models (`src/models/`)

| Model | File | Key Details |
|-------|------|-------------|
| User | `User.ts` | Added `role` field (enum: host/partier, default: partier). Virtual `blockedIds` field. Indexes on phone (unique), username (unique sparse) |
| Party | `Party.ts` | Indexes on city, hostId, date. Enum for securityStatus |
| JoinRequest | `JoinRequest.ts` | Indexes on partyId, requesterId. Enum for status |
| ChatThread | `ChatThread.ts` | Compound index on userAId + userBId |
| Message | `Message.ts` | Indexes on threadId+createdAt, senderId, receiverId. Enum for kind |
| Review | `Review.ts` | Unique compound index on partyId+userId |
| PartyView | `PartyView.ts` | Index on partyId |
| MenuItem | `MenuItem.ts` | Index on partyId. Enum for category |
| Order | `Order.ts` | OrderItem as embedded subdocument (NOT separate collection). Indexes on userId, partyId |
| Ticket | `Ticket.ts` | Unique indexes on orderId and qrHash. Indexes on userId, partyId |
| TrustRating | `TrustRating.ts` | Unique compound index on partyId+guestId |
| SavedParty | `SavedParty.ts` | Unique compound index on userId+partyId |
| PartyMedia | `PartyMedia.ts` | Index on partyId. Enum for type |
| GroupChat | `GroupChat.ts` | GroupChatMember and GroupChatMessage as embedded subdocuments. Unique index on partyId. Virtual memberCount |

### 3. `src/models/index.ts` — Central Export
- Re-exports all models and their TypeScript interfaces
- Importing this file registers all models with Mongoose

### 4. `.env` — Updated
- Added `MONGODB_URI=mongodb+srv://vibematch:vibematch123@cluster0.example.mongodb.net/vibematch?retryWrites=true&w=majority`
- Kept existing `DATABASE_URL` for backward compatibility

## Key Design Decisions
- **OrderItem**: Embedded as subdocument in Order (not a separate collection) per task requirements
- **GroupChatMember & GroupChatMessage**: Embedded as subdocuments in GroupChat per task requirements
- **role field on User**: New field with enum `['host', 'partier']`, default `'partier'`
- **Timestamps**: Models with both createdAt/updatedAt use `timestamps: true`; models with only createdAt use `timestamps: { createdAt: true, updatedAt: false }`
- **Mongoose model guard**: All models use `mongoose.models.X || mongoose.model<X>('X', schema)` to avoid OverwriteModelError in dev mode

## Lint Status
✅ Clean — 0 errors, 0 warnings

## What Was NOT Modified
- No existing files were touched (except `.env` to add MONGODB_URI)
- No API routes or frontend files were changed
- Prisma schema and `src/lib/db.ts` remain untouched
