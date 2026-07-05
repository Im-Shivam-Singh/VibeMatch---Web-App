# Task 3-c: Fix Chat UI & Remove BYOB References

## Summary

### Task 1: Chat UI Fixes

**chat-screen.tsx** — Applied the following fixes:
1. Root container: Added `w-full overflow-x-hidden` to the main chat screen div
2. Message bubbles: Changed `max-w-[78%]` → `max-w-[85%]` on message bubble container
3. Message text overflow: Added `overflow-wrap-anywhere` to both text and video caption `<p>` elements (alongside existing `break-words`)
4. Input area: Added `w-full` to both `<footer>` and the input bar container div
5. Quick replies: Added `max-w-full` to the quick reply scroll container
6. Chat header: Added `min-w-0` to the user name `<p>` element (alongside existing `truncate`)
7. Image/video: Added `max-w-full` to the video element inside message bubbles

**group-chat-screen.tsx** — Applied the same fixes:
1. Root container: Added `w-full overflow-x-hidden`
2. Message bubbles: Changed `max-w-[78%]` → `max-w-[85%]`
3. Message text overflow: Added `overflow-wrap-anywhere` to message content
4. Input area: Added `w-full` to footer and input bar container
5. Chat header: Added `min-w-0` to the party title `<p>` element

### Task 2: Remove BYOB from UI Display Maps

Removed BYOB entries from the following gradient/style maps (while keeping BYOB in VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS in types.ts):

1. **home-screen.tsx**: Removed `BYOB` entry from `VIBE_GRADIENT_BG` map and removed "BYOB" from `recentSearches` array
2. **detail-screen.tsx**: Removed `BYOB` entry from `VIBE_HERO_GRADIENT` map
3. **party-card.tsx**: Removed `BYOB` entry from `VIBE_GRADIENTS` map
4. **onboarding-screen.tsx**: Removed `BYOB` entry from `VIBE_PILL_STYLES` map

**NOT removed** (as instructed):
- BYOB from `VIBE_TAGS` in types.ts (still a selectable vibe)
- BYOB from `VIBE_EMOJI` in types.ts (still has emoji 🍾)
- BYOB from `VIBE_COLORS` in types.ts (still gets a color chip)

**No BYOB toggle/field found** in create-screen.tsx — no changes needed there.
**No dedicated BYOB fields** in types.ts — only in the vibe tag/emoji/color arrays which must be kept.

Lint check: ✅ Passed with no errors.
