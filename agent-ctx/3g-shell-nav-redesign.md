# Task 3g: Redesign App Shell, Bottom Nav, and Sidebar Nav

## Summary
Redesigned the three core navigation/shell components to Dribbble-quality with polished animations, frosted glass effects, and proper layout.

## Files Modified

### 1. `/src/components/vibe/bottom-nav.tsx`
- **Frosted glass background**: `backdrop-blur-[24px]` with `bg-background/70` and rounded-t-2xl container
- **Purple gradient top accent line**: 2px gradient from transparent → purple-500/70 → transparent
- **Active state**: Purple color + `drop-shadow` glow + `scale-110` on icon
- **Active indicator**: Small dot above icon with `animate-ping` pulse animation, animated via `framer-motion` AnimatePresence
- **Active label**: Bold + purple (`font-bold text-purple-300`)
- **Host FAB**: Elevated `-mt-6`, gradient purple disc, ring-4 matching background, soft glow halo behind, `framer-motion` rotate on hover, "Host" label below
- **Badge indicators**: Coral dot with ping on Inbox, count badge on Tickets
- **Safe area**: `pb-[max(env(safe-area-inset-bottom),12px)]`

### 2. `/src/components/vibe/sidebar-nav.tsx`
- **Dark glass background**: `bg-[#0a0910]/95 backdrop-blur-xl` with subtle `border-white/[0.06]`
- **Logo + wordmark**: Gradient icon container with ring, VibeMatch text with purple accent
- **User greeting**: "Hey, {firstName} 👋" with avatar initial in gradient circle
- **8 navigation items**: Explore, Inbox, Tickets, Saved, My Parties, Host Dashboard, Profile, Settings
- **Active item**: Purple background pill (`bg-purple-500/12`) with glow shadow, icon container gets `bg-purple-500/20`, active indicator dot with glow
- **Hover**: Subtle `bg-white/[0.04]` tint
- **Host CTA**: Gradient purple button with Plus icon, `group-hover:rotate-90`, prominent shadow
- **Bottom section**: Logout button with LogOut icon, app version text

### 3. `/src/components/vibe/app-shell.tsx`
- **framer-motion AnimatePresence**: `mode="wait"` with keyed `motion.div`
- **Direction-aware transitions**: Derives forward/back from screen order index comparison
  - Forward: slide in from right (x: 60 → 0), fade out to left (x: 0 → -40)
  - Back: slide in from left (x: -60 → 0), fade out to right (x: 0 → 40)
  - Duration: 200ms ease-out
- **Screen content**: Refactored to `switch`-based `ScreenContent` component for cleaner AnimatePresence
- **Auth flow**: Login → no nav, Onboarding → no nav, Authed+Onboarded → nav visible
- **Layout**: `lg:pl-[280px]` for sidebar offset, dynamic `paddingBottom` for bottom nav + music player
- **MusicPlayerBar**: Only rendered when `showNav` is true

## Technical Details
- All existing store logic preserved (useAppStore with all selectors)
- Same Screen type from @/lib/types
- Same screen routing logic (if current === "login" → LoginScreen)
- All screen imports preserved exactly
- Auth validation effect preserved
- framer-motion for all animations
- lucide-react for icons
- Responsive: BottomNav hidden on lg+, SidebarNav hidden below lg
- Lint clean: no errors
