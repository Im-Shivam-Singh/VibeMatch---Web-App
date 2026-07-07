# Task 4+5+6: Fix overflow, remove theme toggle, remove settings, simplify profile, fix tickets

## Agent: overflow-theme-profile-fixer

## Work Completed

### Task 1: Remove theme toggle and force dark only
- Removed `ThemeProvider` from `providers.tsx` (removed next-themes dependency)
- Added `className="dark"` to `<html>` in `layout.tsx`
- Removed `suppressHydrationWarning` from `<html>` 
- Fixed `sonner.tsx` to hardcode `theme="dark"` instead of `useTheme`
- Removed `ThemeToggle` import/usage from `home-screen.tsx` and `profile-screen.tsx`

### Task 2: Remove Settings links
- Removed Settings nav item from `sidebar-nav.tsx` NAV_ITEMS
- Removed Settings icon import
- Removed targetScreen variable (only needed for Settings special case)

### Task 3: Simplify profile
- Removed Settings QuickAction from both host and partier sections
- Replaced with useful actions (Tickets for host, Host Dashboard for partier)
- Removed Notifications, Privacy & Safety, Help & Support menu rows
- Kept: Edit Profile, Change Role, About VibeMatch, Log Out
- Removed framer-motion remnants (motion.div → div, removed animation props)

### Task 4: Fix overflow for desktop
- Removed `max-w-[100vw]` from all 20 screen files (causes scrollbar width issues)
- Added proper `max-w-*xl mx-auto` constraints:
  - detail-screen: max-w-4xl for content and CTA
  - tickets-screen: max-w-2xl for header, max-w-lg for ticket cards
  - inbox-screen: max-w-2xl for header and content
  - host-dashboard: max-w-4xl for header and body
  - create-screen: max-w-xl for header and form
  - profile-screen: max-w-2xl for header and body
- Fixed app-shell.tsx: removed max-w-[100vw] from root and auth flow wrapper

### Task 5: Fix tickets "View Party"
- Fixed tickets API (`/api/tickets/route.ts`): ensured party data always includes explicit `id` field
- Added fallback partyId lookup (party.id ?? ticket.partyId)
- Fixed TicketCard: uses `partyId` variable with fallback instead of `party.id` directly

## Lint: Zero errors
## Server: Running on localhost:3000
