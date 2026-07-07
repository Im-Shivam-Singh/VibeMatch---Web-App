---
Task ID: 5
Agent: fix-host-not-found
Task: Fix host not found error and data consistency

## Summary
Fixed the "host not found" error that occurred frequently in the VibeMatch app. The root cause was two-fold:
1. The `withDB` wrapper in `mongodb.ts` was dropping the `params` context argument, causing ALL dynamic route handlers to fail with 500 errors
2. Host User records could be missing, causing the requests API to block join request creation

## Key Changes

### Critical Fix: withDB wrapper (`src/lib/mongodb.ts`)
- Changed from single-argument `(req: Request) => Promise<Response>` to variadic `(...args: any[]) => Promise<Response>`
- Now forwards all arguments (including Next.js context with params) to the handler
- Removed type casts from all dynamic route exports

### Data Integrity: Auto-seed (`src/lib/auto-seed.ts`)
- Added `repairHostIntegrity()` function that runs on every startup
- Verifies all parties have valid hostId references
- Fixes broken references by looking up users by hostName
- Creates stub host users if no matching user exists

### API Resilience
- `/api/requests` POST: Creates join requests even without host User record (HOST_NOT_LINKED)
- `/api/requests/[id]` PATCH: Added host name fallback lookup, try/catch for host resolution
- `/api/orders` POST: Wrapped group chat and payment confirmation in try/catch

### Party Type Enhancement
- Added inline host snapshot fields: hostAvatarUrl, hostRating, hostHosted, hostVerified
- Party list and for-you APIs batch-resolve host users and include inline data

### Frontend Resilience
- Detail screen always shows host info (uses party.hostName as fallback)
- Spot requests work even without host profile
- Party card shows host avatar and verified badge from inline data

## Files Modified
1. `src/lib/mongodb.ts` - withDB wrapper fix
2. `src/lib/auto-seed.ts` - host integrity repair
3. `src/lib/types.ts` - Party type inline host fields
4. `src/lib/api.ts` - sendRequest return type
5. `src/app/api/parties/route.ts` - host batch lookup, inline data
6. `src/app/api/parties/[id]/route.ts` - remove type cast, inline host fields
7. `src/app/api/parties/for-you/route.ts` - host batch lookup, inline data
8. `src/app/api/parties/[id]/media/route.ts` - remove type cast
9. `src/app/api/requests/route.ts` - graceful host-not-found handling
10. `src/app/api/requests/[id]/route.ts` - host fallback, remove type cast
11. `src/app/api/orders/route.ts` - try/catch wrappers
12. `src/app/api/menus/[id]/route.ts` - remove type cast
13. `src/app/api/threads/[id]/route.ts` - remove type cast
14. `src/screens/detail-screen.tsx` - always show host info, allow requests without host
15. `src/components/vibe/party-card.tsx` - use inline host data
