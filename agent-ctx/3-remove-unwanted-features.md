---
Task ID: 3
Agent: remove-unwanted-features
Task: Remove BYOB, house parties/meetups categories, hardcoded cities, and location from front page

Work Log:
- Removed "BYOB" from VIBE_TAGS array, VIBE_EMOJI map, and VIBE_COLORS map in `src/lib/types.ts`
- Updated `src/lib/auto-seed.ts`: replaced BYOB references in demo user vibePrefs, party slug/title/vibes/description, and join request messages (changed to "Games" vibe and "Games Night" party)
- Removed `type Tab = "house" | "social"`, `useState<Tab>("house")`, and tab-based filtering logic from `src/screens/home-screen.tsx`
- Removed House parties/Social meetups tab buttons and container from home screen header
- Removed `TabButton` component from home screen (no longer used)
- Changed `filteredParties` from tab-filtered to just `parties` (shows all parties without category filtering)
- Removed city filter tag ("📍 {cityFilter}") from active filter bar on home screen
- Updated "Clear all" and empty state clear buttons on home screen to no longer clear cityFilter
- Changed empty state description from "exploring a different city" to "search for something else"
- Replaced city grid (CITIES.map) in onboarding screen with text input + "Use current location" button
- Removed CITIES and REGIONS imports from onboarding screen, removed CITY_GRADIENTS constant
- Changed default city in onboarding from "Mumbai" to empty string
- Replaced city dropdown in create screen with text Input component
- Removed CITIES import from create screen
- Replaced city dropdown in edit-profile screen with text Input component
- Removed CITIES import from edit-profile screen
- Changed default city in edit-profile from "Mumbai" to empty string
- Replaced city radio-card grid in filter screen with text Input with clear button
- Removed CITIES import, Navigation icon import, radiusKm/setRadiusKm state from filter screen
- Removed radius slider section from filter screen (was tied to hardcoded city selection)
- Ran `bun run lint` — passed with no errors
- Verified dev server compiles successfully

Stage Summary:
- BYOB vibe tag fully removed from types, seed data, and all UI screens
- House parties / Social meetups category tabs removed from home screen; all parties now shown without tab filtering
- Hardcoded city dropdowns/grids replaced with free-text inputs across 4 screens: onboarding, create party, edit profile, and filter
- Location filter chip removed from home page active filter bar; city no longer prominently displayed on front page
- Underlying city filter functionality still works via the filter screen, just no longer hardcoded to specific cities
- No TypeScript or lint errors; app compiles successfully
