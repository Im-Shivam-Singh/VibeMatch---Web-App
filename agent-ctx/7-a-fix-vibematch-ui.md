# Task 7-a: Fix VibeMatch UI

## Summary

Completed two targeted UI fixes for the VibeMatch party app.

## Task 1: Fix CTA button alignment on detail screen

**File**: `/home/z/my-project/src/screens/detail-screen.tsx`

### Changes:
1. **Scrollable content bottom padding** (line 395): Changed `pb-44 lg:pb-8` → `pb-28 lg:pb-20` to properly account for the CTA bar on both mobile and desktop.
2. **CTA bar container** (lines 862-938): 
   - Removed `lg:hidden` so the CTA bar shows on desktop too
   - Added `lg:bottom-6` for proper desktop positioning (no bottom nav on desktop)
   - Wrapped `motion.div` in a `div` with `mx-auto max-w-2xl lg:max-w-lg` to constrain width on desktop and align with body content
   - Structure: outer fixed div → inner max-width container → motion.div with existing content

## Task 2: Remove all location from home screen

**File**: `/home/z/my-project/src/screens/home-screen.tsx`

### Changes:
1. **Removed imports**: `ChevronDown`, `Navigation`, `CITIES` (kept `MapPin` - still used in HotTonightCard)
2. **Removed `userLocation` variable** (was only used by the removed "Find parties near you" CTA)
3. **Header branding**: Changed greeting layout from "Good evening / Hey, {userName} 👋" → "VibeMatch / {greeting}, {userName}"
4. **Replaced city dropdown** with a simple filter icon button (`SlidersHorizontal` icon)
5. **Removed City Filter section** (horizontal pill chips with CityChip components)
6. **Removed CityChip component definition** (no longer used)
7. **Changed section header**: "Happening near you" → "Discover parties"
8. **Removed "Find parties near you" CTA** (the sticky bottom location-enabling button)

### Preserved:
- City filter in `filter-screen.tsx` (untouched)
- `MapPin` in HotTonightCard (shows party location, not a location selector)
- `CITY_CENTERS` and `haversineKm` imports (still used for radius-based filtering when city filter is set from filter screen)
- `cityFilter` state and filtering logic (still functional via filter screen)

## Lint: Passes clean
