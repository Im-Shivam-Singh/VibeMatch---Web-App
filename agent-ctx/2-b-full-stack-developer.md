# Task 2-b — full-stack-developer (group-chat + referrals)

## Task
Build Feature 7 — group chat screen that unlocks for a party after the first guest pays.
Surfaces referral offer cards (Swiggy/Zomato/Blinkit/Zepto/BigBasket/Instamart/Flipkart Minutes)
as the platform ad/revenue model. Also add an "Open group chat" entry button on the
tickets screen (Feature 5 active-events entry point).

## Files touched
- `src/screens/group-chat-screen.tsx` — NEW. Mobile-first group chat screen.
- `src/components/vibe/app-shell.tsx` — registered `GroupChatScreen` import + screen branch.
- `src/screens/tickets-screen.tsx` — added "Open group chat" button per TicketCard.

## What the screen does
- Sticky header: ChevronLeft back + party title (from `api.getParty`) + "{N} members" subtitle
  + MembersStack avatar preview (first 5 + "+N") + manual refresh button.
- Message list: `groupByDay` helper (copied pattern from chat-screen.tsx) — Today / Yesterday /
  <weekday, month, day> day separators.
  - `kind === "system"`: centered glass pill (text-white/60, rounded-full).
  - `kind === "offer"`: festive OfferCard — gradient border (purple→pink→teal), brand emoji
    bubble (looked up via `REFERRAL_BRANDS.find(b => b.id === msg.offerBrand)`), "Group perk"
    eyebrow, brand name, offer text, "Open offer →" button. Tapping shows sonner toast
    `Opening {brand.name} offer…`.
  - `kind === "text"`: bubble; own messages right-aligned
    `bg-purple-500 text-black rounded-[12px_4px_12px_12px]`; others left-aligned
    `glass text-white rounded-[4px_12px_12px_12px] ring-1 ring-white/10`. Shows sender name +
    avatar initial when sender changes.
- Composer: glass-strong footer + safe-bottom. Input + send button. Enter to send. Disabled
  when empty or mutation pending. Typing-dots bubble while a send is in-flight.
- Loading state: HeaderSkeleton + 5 alternating message skeletons.
- LockedState (when `api.getGroupChat` errors — covers both 404 NOT_ENABLED and any other
  failure): Lock icon + "Group chat is locked" + "Group chat unlocks after the first guest
  pays. Be the one to kick it off 🎉" + "Back to party" button. Polls every 8s via
  refetchInterval so it auto-recovers when the chat becomes available.
- `useQuery(["party", partyId], staleTime: 60s)` for the title.
- `useQuery(["group-chat", partyId, userId], refetchInterval: 8_000, retry: 0)` so the chat
  streams new messages without hammering on errors.
- `useMutation(sendGroupMessage)` invalidates the query on success + toast.error on failure.
- Auto-scrolls to bottom on `messages.length` change via useRef + useEffect.

## Tickets screen change
- Imported `MessageCircle` from lucide-react.
- In `TicketCard`, added `setSelectedPartyId` + `setScreen` from useAppStore + an
  `openGroupChat()` helper that calls `setSelectedPartyId(party.id)` then `setScreen("group-chat")`.
- Added a new button (glass + ring-purple-500/40 + MessageCircle icon + "Open group chat"
  label) under the existing "Ready · show QR to host" CTA. No screen redesign — just an
  additional button per the task spec.

## App-shell change
- Added `import { GroupChatScreen } from "@/screens/group-chat-screen";`
- Added `{current === "group-chat" && <GroupChatScreen />}` next to the other branches.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 errors in group-chat-screen.tsx, tickets-screen.tsx, app-shell.tsx.
- Dev server compiles cleanly. GET / 200 in 176ms. No "Failed to compile" or ⨯ errors
  related to my files.
- Ran `bun run db:push` to regenerate the Prisma client (Turbopack cache had a stale client
  module that didn't pick up the new GroupChat models). Restarted dev server with the
  orchestrator's documented `pkill -9 -f next; rm -f dev.log; setsid -f sh -c 'exec node
  ...next dev -p 3000 > dev.log 2>&1'` pattern.

## Known issue (out of scope — orchestrator to fix)
The GET /api/group-chats route does:
```ts
db.groupChat.findUnique({
  where: { partyId },
  include: { members: { include: { user: true } }, messages: { ... } },
})
```
…but the GroupChatMember Prisma model declares only `userId` (a foreign-key column, no
`user User @relation(...)` field). Result: the route 500s with
`Unknown field 'user' for include statement on model 'GroupChatMember'`.

Per task constraints ("Do NOT modify any API routes or the Prisma schema"), I left this
untouched. My screen's LockedState absorbs the 500 gracefully (matches the task spec's
"empty state 'Group chat unlocks after the first guest pays' + back button").

The fix is one of:
1. **Schema**: add `user User @relation(fields: [userId], references: [id])` to
   GroupChatMember (additive, one-line).
2. **API**: drop the `include: { user: true }` and look up users separately by userId.

Once the orchestrator applies either fix, my screen will render the full group-chat
experience (text bubbles, system pills, referral offer cards, members preview, composer)
without any further changes.

## Result
- Group chat screen shipped, registered, and lint-clean.
- Tickets screen now has the active-events entry point.
- All design-system utilities used (`glass`, `glass-strong`, `purple-foil`, `vibe-float`,
  `vibe-gradient-bg`, `eyebrow`, `glow-violet`, `press-feedback`, `animate-screen-in`,
  `fancy-scrollbar`, `safe-bottom`, `vibe-skeleton`).
- shadcn/ui components used: `Input`, `Skeleton`. (Button was unnecessary — custom buttons
  matched the existing chat-screen.tsx style better.)
