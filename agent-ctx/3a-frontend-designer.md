# Task 3a: Redesign Login Screen and Onboarding Screen to Dribbble-quality

## Agent: frontend-designer
## Status: COMPLETED

## Summary
Complete Dribbble-quality redesign of the VibeMatch login and onboarding screens with premium dark theme, neon accents, glassmorphism, and micro-animations.

## Files Modified

### 1. `/home/z/my-project/src/app/globals.css`
Added 20+ new animation keyframes and utility classes:
- `mesh-gradient-shift` — Animated mesh gradient background
- `bokeh-float-1/2/3/4` — CSS-only floating bokeh/particle orbs with 4 different drift patterns
- `logo-pulse-ring` — Expanding ring pulse around VibeMatch logo
- `word-fade-up` — Staggered tagline word animation
- `input-focus-glow` — Animated purple aura on input focus
- `shake-error` — Input shake on validation error
- `shimmer-sweep` — Gradient shimmer sweep on CTA buttons
- `loading-dot-bounce` — Loading dots with staggered bounce
- `otp-slot-enter` — Staggered OTP slot entrance
- `otp-slot-success` — OTP slot success flash (green)
- `card-hover-glow-purple/teal` — Onboarding card glow animations
- `vibe-pill-bounce` — Vibe tag bounce on selection
- `city-pulse` — City card pulse on selection
- `dot-active-pulse` — Progress dot active pulse
- `gradient-text-shimmer` — VibeMatch heading shimmer
- `check-ring-expand` — Checkmark ring expand animation

### 2. `/home/z/my-project/src/screens/login-screen.tsx`
Complete rewrite with Dribbble-quality design:
- **Mesh Gradient Background**: Animated multi-stop gradient that shifts colors
- **Floating Bokeh Particles**: 10+ CSS-only particle orbs (6 large blurred + 5 small bright dots)
- **Logo with Pulse Ring**: Purple gradient icon with expanding ring + glow shadow
- **Gradient Shimmer Heading**: "VibeMatch" with animated gradient text
- **Staggered Tagline**: Words animate in one-by-one with rotation
- **Premium Glass Card**: `glass-premium` with backdrop blur, inner glow, depth
- **Phone Input**: +91 country code badge, focus glow animation, shake on error
- **Name Input**: Same premium styling with focus glow
- **Shimmer CTA Button**: Gradient button with `btn-shimmer` sweep effect on hover
- **Loading Dots**: Animated 3-dot bounce instead of spinner
- **OTP Verification**: 6 individual slots with staggered entrance, glow when focused, success flash (green)
- **Auto-verify**: OTP auto-submits when 6 digits entered
- **Resend Countdown**: 30s countdown timer for resend
- **AnimatePresence**: Smooth slide transitions between phone/OTP steps
- **Dev OTP Display**: Subtle small text for testing

### 3. `/home/z/my-project/src/screens/onboarding-screen.tsx`
Complete rewrite with Dribbble-quality design:
- **Step Order**: role → vibes → city → done (reordered from original)
- **Progress Dots**: Animated width + color transitions, active dot pulse
- **AnimatePresence + Slide Variants**: Directional slide transitions between steps
- **Role Cards**: 
  - Host: Purple gradient with Crown icon, `card-glow-purple` animation
  - Partier: Teal gradient with Compass icon, `card-glow-teal` animation
  - Checkmark with `animate-check-ring` expand on selection
  - Subtle gradient overlay when selected
- **Vibe Pills**: 
  - Each vibe has unique color scheme (8 distinct colors)
  - `animate-vibe-bounce` on selection
  - Mini checkmark with spring animation
  - "Pick at least 2" hint with dynamic count
  - Skip for now option
- **City Cards**:
  - Region-specific gradient tints (UK=blue/purple, India=amber/teal)
  - `animate-city-pulse` on selection
  - Scrollable with `fancy-scrollbar`
  - Staggered entrance animation
- **Done Screen**: 
  - Logo with pulse ring
  - Purple→Teal gradient CTA button
  - Selected vibe tags with unique colors
- **Bottom Navigation**: Back/Continue/Skip with gradient styling

## Technical Details
- All existing API calls preserved: `api.sendOtp`, `api.verifyOtp`, `api.updateUser`
- Store integration maintained: `login(res.user)`, `setOnboarded(true)`, `setUserRole(role)`, `setCityFilter(city)`
- Phone format preserved: `+91{digits}`
- OTP flow: send → verify → login works identically
- Uses framer-motion for all step transitions and spring animations
- Uses existing shadcn/ui components (Button, Input, InputOTP)
- Mobile-first responsive design (max-w container)
- No external animation libraries needed — all CSS-only for particles/backgrounds

## Verification
- ESLint: No new errors introduced (pre-existing detail-screen.tsx error unrelated)
- Dev server: Compiles and serves successfully on port 3000
- No runtime errors in dev.log
