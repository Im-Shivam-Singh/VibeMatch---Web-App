# Task 2 - MongoDB/Mongoose Migration

## Summary
Rewrote ALL 21 API route handlers from Prisma/SQLite to MongoDB/Mongoose. Deleted `src/lib/db.ts` (Prisma client). Lint passed with zero errors.

## Routes Rewritten

| # | Route | Changes |
|---|-------|---------|
| 1 | `auth/otp` | `db.user.findUnique` → `User.findOne`, `db.user.create` → `User.create` |
| 2 | `users` | `db.user.findUnique` → `User.findOne`/`User.findById`, `db.user.update` → `User.findByIdAndUpdate` |
| 3 | `parties` | `db.party.findMany` → `Party.find`, profession filter uses separate User query, `db.party.create` → `Party.create`, `db.partyMedia.createMany` → `PartyMedia.insertMany` |
| 4 | `parties/[id]` | Replaced Prisma `include` with parallel `Promise.all` queries for host, requests, media |
| 5 | `parties/[id]/media` | `db.partyMedia.count` → `PartyMedia.countDocuments`, `db.partyMedia.create` → `PartyMedia.create`, `db.party.update` → `Party.findByIdAndUpdate` |
| 6 | `parties/for-you` | `db.party.findMany` → `Party.find`, scoring logic preserved |
| 7 | `requests` | Complex flow: `db.party.findUnique` + `include` → separate Party + User lookups, `db.chatThread.findFirst` with `OR` → `ChatThread.findOne` with `$or`, `db.joinRequest.create` → `JoinRequest.create`, `db.message.create` → `Message.create` |
| 8 | `requests/[id]` | `db.joinRequest.findUnique` → `JoinRequest.findById`, `db.joinRequest.update` → `JoinRequest.findByIdAndUpdate` |
| 9 | `threads` | `db.chatThread.findMany` with `OR` → `ChatThread.find` with `$or`, per-thread User/Message lookups preserved |
| 10 | `threads/[id]` | Replaced Prisma `include: { userA, userB, messages }` with parallel queries, `db.message.updateMany` → `Message.updateMany`, `db.joinRequest.findFirst` → `JoinRequest.findOne` |
| 11 | `messages` | `db.message.create` → `Message.create`, `db.chatThread.update` → `ChatThread.findByIdAndUpdate` |
| 12 | `saved` | `db.savedParty.findUnique({ where: { userId_partyId } })` → `SavedParty.findOne({ userId, partyId })`, `db.savedParty.findMany` + `include: { party }` → separate queries with Map join |
| 13 | `views` | `db.partyView.groupBy` → `PartyView.aggregate` with `$match` + `$group` |
| 14 | `analytics` | Replaced Prisma nested `include` with parallel bulk queries + Map grouping by partyId |
| 15 | `reviews` | `db.review.upsert` → manual findOne + findByIdAndUpdate or create, `db.review.findMany` + `include: { user }` → separate queries with userMap |
| 16 | `menus` | `db.menuItem.findMany` → `MenuItem.find`, `db.menuItem.create` → `MenuItem.create` |
| 17 | `menus/[id]` | `db.menuItem.delete` → `MenuItem.findByIdAndDelete` |
| 18 | `orders` | Complex: Order with embedded items (Mongoose subdocuments vs Prisma relations), `ensureGroupChat` rewritten for embedded members/messages in GroupChat, `db.groupChatMember.upsert` → `GroupChat.findByIdAndUpdate` with `$push` |
| 19 | `tickets` | `db.ticket.findMany` + `include` → separate Party/Order queries with Map joins |
| 20 | `trust-ratings` | `db.trustRating.upsert` → manual findOne + update/create, `db.trustRating.aggregate` → `TrustRating.aggregate` pipeline |
| 21 | `group-chats` | Embedded subdocs: `gc.members.some()` + `gc.messages.map()` directly on GroupChat doc, POST uses `$push` for embedded messages |
| 22 | `upload` | Does not exist — skipped |
| 23 | `root` | No `db` usage — left as-is |

## Key Patterns Applied

1. **`await connectDB()`** at the start of every handler
2. **`.lean({ virtuals: true })`** on all read queries (includes `id` virtual from `_id`)
3. **`p.id ?? p._id?.toString()`** fallback pattern for safety
4. **Prisma `include`** → parallel `Promise.all` queries + Map joins
5. **Prisma `upsert`** → manual `findOne` + `findByIdAndUpdate` or `create`
6. **Prisma `groupBy`** → Mongoose `aggregate` pipeline
7. **Prisma `$increment`** → Mongoose `$inc`
8. **Embedded subdocuments** (Order.items, GroupChat.members/messages) accessed directly on parent doc
9. **All Date fields** serialized with `?.toISOString?.()` with string fallback
10. **No frontend files** were modified

## Files Deleted
- `src/lib/db.ts` (Prisma client)

## Verification
- `bun run lint` — passed with zero errors
- No remaining `@/lib/db` or `@prisma/client` imports in src/
