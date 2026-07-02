# Task 3e — Redesign Profile, Edit Profile, and Tickets screens

## Agent: fullstack-dev
## Task: Complete Dribbble-quality redesign of three screens

### Files Rewritten

1. **`/home/z/my-project/src/screens/profile-screen.tsx`** — Complete rewrite
2. **`/home/z/my-project/src/screens/edit-profile-screen.tsx`** — Complete rewrite
3. **`/home/z/my-project/src/screens/tickets-screen.tsx`** — Complete rewrite

### Design Decisions

#### Profile Screen
- **Hero section**: Gradient background (purple-deep → transparent), avatar with gradient ring border (purple-bright → purple → teal), camera icon overlay button for edit
- **Animated count-up stats**: Custom `useCountUp` hook with ease-out cubic, three columns for Vibes / Hosted / Rating
- **Quick Actions 2×2 grid**: Color-coded cards (purple, teal, amber, coral) with count badges, different options for host vs partier role
- **Menu items**: Clean rows with icon backgrounds, support for danger styling (Log Out in red)
- **Version footer**: Subtle branding at bottom
- All animations use framer-motion `initial`/`animate` with staggered delays

#### Edit Profile Screen
- **Save button**: Disabled state when no changes detected via `useMemo` comparison
- **Avatar section**: Same gradient ring as profile, horizontal scrollable avatar picker with active state (scale + purple ring)
- **Form fields**: Custom `Field` wrapper with dot indicator, character counts for Name (40 max) and Bio (150 max)
- **Username**: `@` prefix, availability check visual (green checkmark), alphanumeric filter
- **City/Profession**: Styled select dropdowns matching the dark theme
- **Vibe preferences**: Multi-select chips using VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS from types — colored when selected, muted when not
- **Delete Account**: Red text button, opens an animated confirmation dialog (framer-motion + AnimatePresence) with spring animation, backdrop blur, warning icon
- **Loading state**: Spinning border animation on Save button during mutation

#### Tickets Screen
- **Header**: "My Tickets" title with eyebrow, ticket count badge
- **Filter tabs**: Upcoming / Past segmented control with purple-bright active state
- **Ticket cards**: Premium design with:
  - Gradient accent strip at top (color based on party vibes)
  - Party title + host name + status badge (Valid/Used/Expired)
  - Date, time, area with icon accents
  - Compact vibe tags
  - QR code (90px) alongside countdown badge and ticket number
  - Pre-order add-on pills
  - Two action buttons: "View Party" and "Show QR"
- **Expandable detail**: Animated expand/collapse with full QR (160px), order details, guest list confirmation, "Ready · show QR to host" gradient CTA, and group chat button
- **Empty state**: Floating ticket icon with purple glow, "Find a party" CTA
- **Status logic**: Valid (teal), Used (muted), Expired (red) based on scannedAt and party end time
- All animations use framer-motion with spring/ease transitions

### Technical Details
- Preserved all existing API calls (`api.getUser`, `api.updateUser`, `api.listTickets`)
- Preserved all store logic (`useAppStore` selectors)
- Preserved all type imports (VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS, CITIES, PROFESSIONS, parseVibes, etc.)
- QR placeholder logic preserved identically (deterministic 7×7 grid with finder patterns)
- Used framer-motion for all animations
- Used lucide-react for all icons
- Lint passes cleanly with zero errors
- Dev server compiles and serves 200 successfully

### Verification
- `bun run lint` → 0 errors
- Dev server running on port 3000, GET / returns 200
