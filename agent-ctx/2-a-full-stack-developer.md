# Task 2-a — full-stack-developer (manage-party screen)

## What was asked
Build `src/screens/manage-party-screen.tsx` — a host's "edit after creation" screen for a party they own. Includes inline menu item CRUD, photo/video gallery management (device upload + presets), and a group-chat toggle. Register the screen in `src/components/vibe/app-shell.tsx`. Do NOT modify `detail-screen.tsx`, the API routes, or the Prisma schema.

## Work Log
- Read worklog.md to absorb prior context — confirmed `api.uploadMedia`, `api.addPartyMedia`, `api.deletePartyMedia`, `api.listMenu`, `api.addMenuItem`, `api.deleteMenuItem`, `api.setGroupChatEnabled` were all already wired in `src/lib/api.ts` by a previous agent.
- Read `src/screens/create-screen.tsx` for the upload pattern (hidden `<input type=file>` + XHR-based `api.uploadMedia` with progress callback).
- Built the new screen with three sections inside `glass-strong` cards: (1) Menu & drinks with inline add form + grouped list, (2) Photos & videos with grid + upload + presets, (3) Group chat switch with optimistic UI.
- Used TanStack Query for fetching (`["party", id]`, `["menu", id]`) and `useMutation` for all writes; each mutation invalidates the relevant query on success.
- Reused the device upload flow: hidden multi-file input → `api.uploadMedia(files, onProgress)` → on success, calls `api.addPartyMedia` in parallel for each accepted file. Progress bar with purple→pink gradient.
- Presets panel is an inline collapsible (4 Unsplash photos + 2 Pexels videos) — no Dialog dependency needed.
- Sticky header (back button + truncated party title) and sticky footer "Done" button calling `goBack()`.
- Lint pass 1: clean except a `react-hooks/set-state-in-effect` error from initial `useEffect`-sync approach for the group-chat switch. Refactored to a derived `gcEnabled = gcOptimistic ?? !!party?.groupChatEnabled` pattern with an `onSettled` clear — no effect, no cascading renders.
- Lint pass 2: clean. dev.log shows `✓ Compiled` for both `manage-party-screen.tsx` and `app-shell.tsx` hot reloads. (Pre-existing unrelated Prisma error in `/api/group-chats/route.ts` — `Unknown field 'user' for include on GroupChatMember` — left untouched per task scope.)

## Files touched
- `src/screens/manage-party-screen.tsx` (new, ~950 lines)
- `src/components/vibe/app-shell.tsx` (import + 1 conditional render line)

## Stage Summary
The manage-party screen is live and registered at the `manage-party` route in the app shell. The orchestrator only needs to change `detail-screen.tsx`'s "Manage your party" button from `setScreen("host-dashboard")` to `setScreen("manage-party")` to wire it in. All API helpers it depends on are pre-existing.
