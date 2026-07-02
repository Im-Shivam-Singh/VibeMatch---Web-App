# Task 3d — Redesign Chat, Group Chat, and Inbox screens to Dribbble-quality

## Agent: frontend-design

## Summary
Complete rewrite of three screen files with Dribbble-quality UI while preserving all existing API calls, store logic, and component exports.

## Files Modified

### 1. `/home/z/my-project/src/screens/inbox-screen.tsx`
**Complete rewrite** — New features:
- **Header**: "Messages" title with animated unread count badge (gradient amber-to-coral pill)
- **Search input**: Frosted search bar with proper icon and focus ring
- **Online Now section**: Horizontal scrollable avatars with teal online dots and gradient ring borders
- **Tab filter**: "All" / "Unread" tabs with framer-motion `layoutId` animated underline indicator
- **Thread cards**: Rich cards with gradient avatar borders (unread), teal online indicators for recent, party context badges, relative timestamps, and coral/amber gradient unread count badges
- **Loading**: Shimmer skeleton matching full thread card layout (search bar + online avatars + thread cards)
- **Empty state**: Contextual messaging per tab/search state
- **Animations**: framer-motion `AnimatePresence` with staggered entry, scale animations

### 2. `/home/z/my-project/src/screens/chat-screen.tsx`
**Complete rewrite** — New features:
- **Header**: Back button + gradient-bordered avatar + name + rating pill + online status indicator (teal dot) + party context pill + three-dot menu
- **Message bubbles**: 
  - Current user: Purple gradient (`from-purple-500 to-purple-600`) right-aligned with shadow glow
  - Other user: Dark glass (`bg-white/[0.06]` with `ring-1 ring-white/[0.1]`) left-aligned
  - System: Centered, muted text with clock icon
  - Payment CTA: Special card with gradient border, teal accent, "Pay" / "✓ Paid" states
  - Video: Thumbnail with play button overlay
- **Read receipts**: Double teal check marks for read, single for unread
- **Typing indicator**: Animated dots in glass bubble with framer-motion AnimatePresence
- **Input bar**: Frosted glass container with camera attachment button, auto-expand text input, animated send button (gradient when active, muted when empty)
- **Lock hints**: Animated lock/unlock banners for pre-payment state
- **Quick replies**: Horizontal scrollable chips for early conversation
- **Report/Block**: Sheet + dialog with same visual language
- **All animations**: framer-motion `motion.div` for bubbles, `whileTap` for send button

### 3. `/home/z/my-project/src/screens/group-chat-screen.tsx`
**Complete rewrite** — New features:
- **Header**: Party title + "Group Chat" subtitle + member count badge + avatar stack + info button
- **Members sheet**: Bottom sheet with full member list, join times, "(you)" indicator
- **Messages**: Same purple gradient / glass bubble styling as 1:1 chat
- **Sender names**: Color-coded per sender (6-color palette: purple, teal, amber, coral, green, pink) with deterministic assignment
- **System messages**: Centered muted pill
- **Offer cards**: Animated festive gradient border cards with brand emoji, "Group perk" label, offer text, and "Get deal" CTA button
- **Welcome banner**: Gradient background with sparkles icon
- **Composer**: Same frosted glass container as 1:1 chat (camera + input + animated send)
- **Locked state**: Animated lock icon with gradient glow, CTA button

## Technical Decisions
- Used `framer-motion` for all animations (layoutId for tab indicator, AnimatePresence for conditional elements, motion.div for message bubbles)
- Used `motion.button` with `whileTap={{ scale: 0.9 }}` for send buttons
- Kept ALL existing API calls and store logic intact
- Kept `useChatSocket` import and graceful handling when not connected
- Used proper `GroupChatMember` type from types.ts instead of inline types
- Auto-scroll to bottom preserved with `useEffect` on `messages.length`
- `relativeTime` from types.ts used for all timestamps
- No new dependencies added

## Verification
- ESLint: Clean (no errors)
- TypeScript: No errors in the three screen files
- Dev server: Running, no compilation errors
