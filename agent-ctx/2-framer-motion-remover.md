---
Task ID: 2
Agent: framer-motion-remover
Task: Remove all Framer Motion animations from VibeMatch codebase

Work Log:
- Searched entire src/ directory for framer-motion imports: found 26 files
- Removed all `import { ... } from "framer-motion"` lines from all 26 files
- Replaced all `motion.div` → `div`, `motion.button` → `button`, `motion.span` → `span`, `motion.section` → `section`, `motion.header` → `header`, `motion.li` → `li`, `motion.h2` → `h2`, `motion.p` → `p`, `motion.a` → `a`
- Removed all `<AnimatePresence>` and `</AnimatePresence>` wrappers (kept children)
- Removed all animation props: `initial={...}`, `animate={...}`, `exit={...}`, `transition={...}`, `whileTap={...}`, `whileHover={...}`, `layout`, `layoutId={...}`, `variants={...}`
- Removed `useScroll` and `useTransform` hooks from detail-screen.tsx (parallax scroll effects)
- Removed parallax scroll style (heroScale, heroOpacity, heroTranslateY) from detail-screen.tsx
- Removed variant/transition constants from app-shell.tsx (SCREEN_ORDER, screenIndex, slideDuration, variantsForward, variantsBack, transition)
- Removed prevScreen usage for direction tracking from app-shell.tsx
- Removed stagger variant constant and references from host-dashboard-screen.tsx
- Fixed broken JSX syntax from automated prop removal (orphaned `}}` fragments) in party-card.tsx, host-dashboard-screen.tsx, my-parties-screen.tsx, create-screen.tsx, detail-screen.tsx, home-screen.tsx
- Converted animated progress bars to static CSS `style={{ width: `${pct}%` }}` in host-dashboard-screen.tsx, my-parties-screen.tsx, create-screen.tsx
- Converted animated active pill background in bottom-nav.tsx to CSS transitions (opacity/scale via conditional classes)
- Rewrote loading-context.tsx to use simple conditional rendering instead of AnimatePresence
- Rewrote notification-bell.tsx to use simple conditional rendering instead of AnimatePresence
- All 26 files modified:
  1. src/components/layout/app-shell.tsx
  2. src/components/layout/bottom-nav.tsx
  3. src/components/party/party-card.tsx
  4. src/components/shared/loading-context.tsx
  5. src/components/shared/notification-bell.tsx
  6. src/features/auth/screens/login-screen.tsx
  7. src/features/auth/screens/onboarding-screen.tsx
  8. src/features/chat/screens/chat-screen.tsx
  9. src/features/chat/screens/group-chat-screen.tsx
  10. src/features/chat/screens/inbox-screen.tsx
  11. src/features/host/screens/host-dashboard-screen.tsx
  12. src/features/host/screens/manage-party-screen.tsx
  13. src/features/host/screens/my-parties-screen.tsx
  14. src/features/host/screens/requests-screen.tsx
  15. src/features/party/screens/countdown-screen.tsx
  16. src/features/party/screens/create-screen.tsx
  17. src/features/party/screens/detail-screen.tsx
  18. src/features/party/screens/filter-screen.tsx
  19. src/features/party/screens/home-screen.tsx
  20. src/features/party/screens/map-screen.tsx
  21. src/features/party/screens/saved-screen.tsx
  22. src/features/profile/screens/edit-profile-screen.tsx
  23. src/features/profile/screens/profile-screen.tsx
  24. src/features/tickets/screens/confirmation-screen.tsx
  25. src/features/tickets/screens/payment-screen.tsx
  26. src/features/tickets/screens/tickets-screen.tsx

Stage Summary:
- All Framer Motion removed from 26 files — zero imports, zero animation props, zero motion components remain
- All styling, layout, and functionality preserved — only animations removed
- Progress bars converted from framer-motion width animation to CSS style
- Active nav indicators use CSS transitions instead of framer-motion
- Parallax scroll effect removed from detail screen (was using useScroll/useTransform)
- Screen transitions removed from app-shell (was sliding screens left/right)
- Lint passes with zero errors
- App compiles and serves correctly on port 3000
