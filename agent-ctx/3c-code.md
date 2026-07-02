# Task 3c: Redesign Party Detail Screen and Create Party Screen to Dribbble-quality

## Agent: Code

## Summary
Complete redesign of both `detail-screen.tsx` and `create-screen.tsx` with premium Dribbble-quality UI, preserving all existing API calls, store logic, and component interfaces.

## Changes Made

### 1. `/home/z/my-project/src/screens/detail-screen.tsx` — Complete Rewrite
- **Hero Section**: Full-bleed cover with parallax scroll effect (framer-motion `useScroll` + `useTransform`), gradient overlay from bottom for text readability
- **Floating Glass Buttons**: Back button, Share button, and animated Heart/Save button with frosted glass style (`bg-white/10 backdrop-blur-xl border border-white/20`)
- **Live/Starting Soon Badge**: Animated pulsing dot for "Live now", countdown text for "Starting soon"
- **Quick Info Bar**: Horizontal scrollable pills for Date, Time, Location (tappable — opens Google Maps), and Fee (highlighted)
- **Title Section**: Large bold title with host name + avatar + "Verified" badge + "View host profile" tappable link
- **Vibe Tags**: Horizontal scrollable colored pills using VIBE_COLORS, each with its emoji
- **Description**: Expandable text with smooth height animation (`motion.div animate maxHeight`), gradient fade when collapsed, "Read more" / "Show less" toggle
- **Who's Going**: Avatar stack using `pickGuestAvatars` (5 max + "+N more"), "Join X others" text, "See all" button, "Full names visible after payment" lock note
- **Menu Section**: Horizontal scrollable category tabs (Drinks/Snacks/Soft) with count badges, menu items as cards with emoji, name, price, and "Add to order" plus button
- **Reviews Section**: Kept existing `ReviewsSection` component
- **Host Controls**: Grid of cards (Edit party, Manage requests with badge, Group chat, Analytics) — only shown when user is host
- **Sticky CTA Bar**: Frosted glass bar fixed to bottom with "Request to Join" button (gradient + shimmer animation), fee display, spots remaining indicator, approval badge
- **Security Badge**: Teal-themed "Verified security on-site" card when `securityBooked` is true
- **Skeleton Loading**: Premium skeleton with proper layout matching the new design
- **All existing API calls preserved**: `api.getParty`, `api.listMenu`, `api.recordView`, `api.ensureThread`, `api.sendRequest`, `api.uploadMedia`

### 2. `/home/z/my-project/src/screens/create-screen.tsx` — Complete Rewrite
- **Step-by-step form with progress indicator**: 4 steps (Basics, When & Where, Vibe & Settings, Menu)
- **Animated transitions**: framer-motion `AnimatePresence` with spring-based slide transitions between steps
- **Progress bar**: Animated gradient progress segments at top
- **Step dots**: In bottom bar, showing completed/current/upcoming state with check marks
- **Step 1 (Basics)**: Large prominent title input, description textarea with character count and tips, drag & drop cover image upload zone, preset cover image picker with thumbnail strip
- **Step 2 (When & Where)**: Date picker with calendar icon, time picker with clock icon, city selector dropdown, area/address input, map pin preview placeholder, security add-on toggle with teal info card
- **Step 3 (Vibe & Settings)**: Vibe multi-select grid (same style as onboarding with VIBE_COLORS), max guests slider with +/- buttons and number display, entry fee input with currency symbol, "Approval required" toggle, "Accept walk-ins" toggle
- **Step 4 (Menu)**: Optional step with info banner, category tabs (Drinks/Snacks/Soft), menu items with emoji picker, name, price, delete button, add item button, menu preview section
- **Bottom Bar**: Progress steps, Back/Next buttons, "Create Party" on final step with party popper icon and gradient + shimmer
- **All existing API calls preserved**: `api.createParty`, `api.uploadMedia`
- **All existing store logic preserved**: `goBack`, `setScreen`, `setSelectedPartyId`, `currentUser`

## Technical Details
- All hooks called before early returns (fixed conditional `useState` for `menuCategory`)
- All `useCallback` dependencies match React Compiler expectations (fixed `data?.party.title` → `data`)
- `framer-motion` used for page transitions, parallax, element animations, shimmer effects
- All shadcn/ui components used (Button, Input, Textarea, Label, Switch, Slider, Sheet, etc.)
- All constants preserved: VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS, CITIES, MENU_CATEGORIES
- Responsive design maintained
- Lint passes cleanly with zero errors

## Files Modified
1. `/home/z/my-project/src/screens/detail-screen.tsx` — Complete rewrite (~1250 lines)
2. `/home/z/my-project/src/screens/create-screen.tsx` — Complete rewrite (~630 lines)
