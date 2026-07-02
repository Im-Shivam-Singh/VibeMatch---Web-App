# Task 3b — Redesign Home Screen and Party Cards to Dribbble-quality

## Agent: UI Redesign Agent
## Status: ✅ Completed

## Summary
Complete Dribbble-quality redesign of the VibeMatch home screen and party cards with premium animations, frosted glass effects, and polished micro-interactions.

## Files Modified

### 1. `/home/z/my-project/src/app/globals.css`
Added 15+ new CSS animations and utility classes:
- **premium-shimmer** — Multi-color shimmer sweep (purple → amber) for loading skeletons
- **card-lift / card-press** — Hover elevation + press feedback for cards
- **live-pulse-dot / live-pulse-ring** — Animated pulsing red dot + expanding ring for LIVE indicators
- **gradient-shift** — Animated background-position sweep for hero sections (300% size, 8s cycle)
- **frosted-glass** — Stronger blur (24px) + saturate for search bar
- **search-glow** — Focus state glow ring for search input
- **heart-fill-anim** — Spring bounce animation on heart save
- **urgency-flash** — Pulsing opacity for "Only X left!" badges
- **glow-ring-pulse** — Pulsing box-shadow ring for active vibe stories
- **float-cta** — Gentle float animation for bottom CTA pill
- **stagger-up** — Children entrance animation with spring easing
- **scroll-fade-x** — Mask-image fade edges for horizontal scroll sections

### 2. `/home/z/my-project/src/components/vibe/party-card.tsx` (Complete Rewrite)
**Cover Section:**
- Full-width cover image with `gradient-shift` animated gradient fallback per vibe
- Multi-layer gradient overlays (from-top + from-left) for depth
- Floating vibe emoji — large, centered, subtle opacity with hover scale
- LIVE badge with animated pulsing dot + expanding ring
- "Starting soon" badge with amber background
- Video badge (forward-looking, when media array includes video)
- Save heart button with `motion` whileTap scale + `heart-fill-anim` on save
- Fee badge (bottom-left) — teal for Free, amber for paid
- Spots remaining badge (bottom-right) — urgency flash when low

**Content Section:**
- Title: font-display, line-clamp-2, hover color transition
- Host info row with Sparkles icon in purple circle
- Metadata: MapPin (purple), Calendar (amber), Clock (teal) with colored icons
- Vibe pills with VIBE_COLORS per-vibe coloring + emoji
- "+N more" overflow indicator
- GuestAvatars stack (who's going)

**Interactions:**
- Framer Motion: `initial` (opacity 0, y 24), `animate` (entrance), `whileHover` (lift -6px), `whileTap` (scale 0.975)
- Staggered entrance with `index * 0.06` delay
- Smooth shadow transition on hover
- Active press feedback

### 3. `/home/z/my-project/src/screens/home-screen.tsx` (Complete Rewrite)
**Header Section:**
- Time-aware greeting ("Good morning/afternoon/evening/night, {name} 👋")
- City quick-select chip with MapPin icon + ChevronDown
- Notification bell with coral dot indicator
- MusicPlayerButton (existing)
- Saved heart with badge count
- Profile avatar

**Search Bar:**
- Frosted glass effect on focus (24px blur + saturate 1.4)
- Animated search-glow ring on focus
- Voice search icon (decorative Mic)
- Clear button (X) when text present
- Recent search suggestions dropdown with AnimatePresence (fades in/out)
- Click-outside closes suggestions

**Tabs:**
- House/Social tabs with active border + shadow styling

**Hot Tonight Section:**
- Horizontal scrollable featured cards (280px wide each)
- Live indicator with pulsing dot in section header
- "Hot Tonight" with event count
- Custom `HotTonightCard` component with:
  - Animated gradient backgrounds per vibe
  - LIVE/Starting soon badges
  - Save heart, fee badge, spots remaining
  - Title, location, time in compact layout
  - Staggered entrance with framer-motion
  - scroll-fade-x mask for edge fading

**City Filter:**
- Horizontal scrollable pill chips
- Active city: gradient fill (from-purple-500 to-purple-600) + glow-ring-pulse
- "All" chip with 🌍 icon
- whileTap scale animation

**Vibe Filter:**
- Story-style circles with unique gradient backgrounds
- Active vibe: ring-2 ring-purple-400 ring-offset + glow-ring-pulse
- Inactive: ring-1 ring-white/10, gradient at 40% opacity
- whileTap scale animation

**Active Filter Bar:**
- AnimatePresence for mount/unmount with height animation
- Filter tags with clear buttons
- "Clear all" link

**Party Feed:**
- Responsive grid: 1 col mobile, 2 col sm, 3 col lg
- PartyCard component with staggered entrance
- Premium shimmer loading skeleton (6 cards)

**Sticky Bottom CTA:**
- "Find parties near you" floating pill with Navigation icon
- Only shows when user hasn't granted location
- float-cta animation (gentle bob)
- AnimatePresence for mount/unmount
- Requests geolocation on click

## Technical Notes
- All existing data fetching logic preserved (useQuery, api.listParties)
- All store logic preserved (useAppStore for filters, saved, etc.)
- Same props and exports maintained
- Framer Motion used for all animations
- Lucide React icons throughout
- Responsive: mobile-first, grid on desktop
- openParty function works: `setSelectedPartyId(id); setScreen("detail")`
- City chips use CITIES from types
- Vibe stories use VIBE_TAGS, VIBE_EMOJI from types
- House/Social tab functionality maintained

## Lint Results
All new code passes ESLint. Pre-existing errors in detail-screen.tsx and login-screen.tsx are unrelated.
