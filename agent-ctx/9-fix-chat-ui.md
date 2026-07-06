---
Task ID: 9
Agent: fix-chat-ui
Task: Fix chat UI and chat service

Work Log:
- Analyzed all chat-related files: chat-screen.tsx, inbox-screen.tsx, group-chat-screen.tsx, use-chat-socket.ts, and chat-service
- Fixed chat-screen.tsx: changed root container from `min-h-[100dvh]` to `h-[100dvh]` with `overflow-hidden` to ensure proper flex layout with sticky header/footer and scrollable messages area
- Added `shrink-0` to header and footer elements in chat-screen.tsx so they don't collapse when messages overflow
- Added `min-w-0` and `shrink-0` to input field and buttons in chat-screen.tsx composer to prevent flex overflow with long text
- Added `overflow-hidden` to the composer container in chat-screen.tsx
- Fixed inbox-screen.tsx: changed `overflow-x-hidden` to `overflow-hidden` on root, added `shrink-0` to header, added `min-w-0` to search input, added `break-words` to thread message preview, increased bottom padding to `pb-24` to avoid bottom nav overlap
- Fixed group-chat-screen.tsx: same layout fixes as chat-screen (h-[100dvh], overflow-hidden, shrink-0 on header/footer, min-w-0 and shrink-0 on input/buttons, overflow-hidden on composer)
- Fixed use-chat-socket.ts: added re-identification on every connect (including reconnects), reset identified ref on disconnect, added connect_error handler for debugging, added timeout config
- Fixed chat-service/index.ts: added cleanup of previous socket mapping on re-identification, added null reset on disconnect, added disconnect reason logging, added health-check HTTP endpoint
- Installed chat service dependencies (socket.io) and started the chat service on port 3003
- Verified lint passes cleanly with no errors
- Verified dev server compiles successfully

Stage Summary:
- All three chat UI screens now use fixed viewport height (h-[100dvh]) with overflow-hidden for proper flex layout
- Message bubbles already had break-words and overflow-wrap-anywhere (confirmed working)
- Input bars now have min-w-0 and shrink-0 to prevent overflow with long text
- Headers and footers have shrink-0 so they remain fixed while messages scroll
- Socket reconnection now properly re-identifies the user
- Chat service is running on port 3003 and accepting connections
- No lint errors
