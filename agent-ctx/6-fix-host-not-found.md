# Task 6: Fix "host not found" error in VibeMatch party app

## Agent: code-fixer
## Status: COMPLETED

## Root Cause Analysis

The "host not found" error had multiple root causes:

1. **Missing host user record**: When a party is created via `POST /api/parties`, the host is looked up by `hostName`. If no matching User document exists, `hostId` is set to `null`, leaving the party with no host reference.

2. **No fallback host lookup**: When fetching party details (`GET /api/parties/[id]`), if `hostId` doesn't resolve to a User (deleted user, invalid ObjectId, etc.), the API returned `host: null`, causing frontend crashes.

3. **Hard failure on join requests**: `POST /api/requests` returned a 400 error "This party has no host to message" when the host User record was missing — blocking users entirely with no recovery path.

4. **No try/catch around DB lookups**: `User.findById()` calls could throw on invalid ObjectIds or DB errors, crashing the entire API route.

5. **Frontend null access**: `detail-screen.tsx` accessed `data.host.id`, `host.name`, etc. without null guards. `chat-screen.tsx` similarly accessed `other.name` without fallbacks.

## Changes Made

### Backend API Routes

1. **`/api/parties/[id]/route.ts`** — Party detail
   - Added try/catch around host lookup
   - Added fallback: try `User.findById(hostId)` first, then `User.findOne({ name: hostName })`
   - Instead of returning `host: null`, returns a fallback host object with `name: party.hostName || "Unknown Host"` and zeroed stats
   - This ensures the frontend always receives a valid host object

2. **`/api/requests/route.ts`** — Join requests
   - Added try/catch around host lookup
   - Added fallback name lookup: tries `User.findById(hostId)`, then `User.findOne({ name: hostName })`
   - Changed error response from generic "This party has no host to message" to structured error with `code: "HOST_NOT_FOUND"` and `hostName` field for frontend display

3. **`/api/threads/route.ts`** — Thread list
   - Added try/catch around `User.findById(otherId)` lookup
   - Changed `otherUser: undefined` fallback to a default `{ id: otherId, name: "Unknown User", vibes: 0, hosted: 0, rating: 0, ratingCount: 0 }` object

4. **`/api/threads/[id]/route.ts`** — Thread detail
   - Added try/catch around `Promise.all([User.findById(userAId), User.findById(userBId), Message.find(...)])`
   - Falls back to still fetching messages if user lookups fail
   - Changed `otherUser: null` fallback to a default "Unknown User" object with all fields

5. **`/api/parties/route.ts`** — Party creation
   - Added try/catch around `User.findOne({ name: hostName })` so party creation doesn't fail if host lookup errors

### Frontend

6. **`detail-screen.tsx`** — Party detail screen
   - `messageHost`: Split the condition — separate "not signed in" from "host profile unavailable" with distinct error messages
   - `requestMutation`: Separate "not signed in" from `HOST_NOT_FOUND` error
   - Added `HOST_NOT_FOUND` error handler in `onError` callback with user-friendly message
   - Changed `isOwn` check to use `!!host?.id` instead of `!!host`
   - Host name display: uses `host.name ?? "Unknown Host"` fallback
   - Verified badge: only shown when `host.id` exists
   - "View host profile" link: only shown when `host.id` exists, otherwise shows "Host profile unavailable"

7. **`chat-screen.tsx`** — Chat screen
   - Changed `other` fallback from `null` to a default `{ id: "", name: "Unknown User", ... }` object
   - Added `?? "Unknown User"` fallback to all `other.name` accesses (8 locations)
   - Changed null checks from `!other` to `!other?.id` for send/type guards

## Testing
- ESLint: passes with no errors
- Dev server: running successfully on port 3000
