# Task 12+15: Fetch only on tab switch, current location recommendations

## Agent: fetch-location-agent

## Changes Made

### 1. providers.tsx — QueryClient config
- `staleTime: 30_000` → `staleTime: Infinity`
- Added `refetchOnReconnect: false`
- Added `refetchOnMount: false`
- Result: Data never auto-refetches; only invalidated explicitly

### 2. app-shell.tsx — Tab-switch invalidation
- Added `useQueryClient` import
- Added `useEffect` watching `screen` changes
- Invalidates relevant query keys per screen:
  - home → parties, parties-for-you
  - tickets → tickets
  - inbox → threads
  - profile → user
  - saved → saved
  - my-parties → my-parties
  - host-dashboard → analytics

### 3. home-screen.tsx — Geolocation + Near You section
- Added `userLocation` and `setUserLocation` from store
- Added `useEffect` on mount calling `navigator.geolocation.getCurrentPosition()`
  - Silent error fallback (console.log only)
  - Stores in Zustand's `userLocation` field
- Added `nearYouParties` useMemo: filters parties with lat/lng within 25km, sorted by distance, capped at 8
- Added "Near You" section between Hot Tonight and Vibe Filter
  - Teal-themed horizontal scroll
  - Shows distance badge ("1.2km away" or "350m away")
- Added `NearYouCard` sub-component with:
  - Cover image with gradient overlay
  - Distance badge (teal)
  - LIVE badge, save heart, fee + spots
  - Title, location, time info

### 4. /api/parties/for-you/route.ts — Location-based scoring
- Added `haversineKm` import
- Reads optional `lat` and `lng` query params
- Proximity boost scoring:
  - ≤5km → +0.3
  - ≤10km → +0.2
  - ≤25km → +0.1
- Added to existing score formula alongside vibe, city, social, freshness scores

### 5. lib/api/index.ts — forYou method
- `forYou(userId)` → `forYou(userId, location?)`
- If location provided, passes `lat` and `lng` as query params

## Lint Status
- All clean, zero errors, zero warnings
