# VibeMatch — Full Project Context Document

> **Purpose**: Reusable context for continuing development in new AI sessions.  
> **Last Updated**: 2025-07-02  
> **Commit**: `eec7ffc` on `main` branch

---

## 1. Project Overview

**VibeMatch** is a party discovery PWA — users find local parties, connect with hosts, join events, and manage the full lifecycle (discovery → request → payment → ticket → post-event).

- **Live Repo**: `https://github.com/Im-Shivam-Singh/VibeMatch---Web-App.git`
- **GitHub PAT**: See local config (not committed to repo)
- **Local Path**: `/home/z/my-project`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 with App Router (port 3000) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) + Lucide icons |
| Database | MongoDB Atlas via Mongoose ODM |
| State | Zustand (persisted to localStorage) + TanStack Query |
| Realtime | Socket.IO mini-service on port 3003 |
| Animations | Framer Motion |
| Auth | OTP-based phone auth (no NextAuth) |
| AI SDK | z-ai-web-dev-sdk (VLM + LLM moderation) |
| Reverse Proxy | Caddy (port 81 → Next.js 3000) |

### MongoDB Atlas
- **URI**: `See .env file (MONGODB_URI)`
- Stored in `.env` as `MONGODB_URI`
- Auto-seeds 13 parties + sample users on first run (`/src/lib/auto-seed.ts`)

---

## 3. Project Structure

```
src/
├── app/
│   ├── api/                    # All API routes
│   │   ├── analytics/          # Host analytics
│   │   ├── auth/otp/           # OTP send + verify
│   │   ├── group-chats/        # Group chat CRUD
│   │   ├── health/             # Health check
│   │   ├── menus/              # Menu item CRUD
│   │   ├── messages/           # Message persistence
│   │   ├── notifications/      # Notification CRUD
│   │   ├── orders/             # Order + ticket creation
│   │   ├── parties/            # Party CRUD + [id] + for-you + media
│   │   ├── requests/           # Join request CRUD + [id] accept/reject
│   │   ├── reviews/            # Review CRUD
│   │   ├── saved/              # Saved/liked parties
│   │   ├── threads/            # Chat thread CRUD + [id]
│   │   ├── tickets/            # Ticket listing
│   │   ├── trust-ratings/      # Host→guest trust ratings
│   │   ├── upload/             # File upload (images up to 10MB, videos up to 60MB)
│   │   ├── user-party-status/  # Check if user is in a party
│   │   ├── users/              # User CRUD
│   │   └── views/              # Party view tracking
│   ├── globals.css             # Global styles + CSS variables + animations
│   ├── layout.tsx              # Root layout with Providers
│   └── page.tsx                # Entry point → AppShell
├── components/
│   ├── providers.tsx           # QueryClientProvider + ThemeProvider + LoadingProvider
│   ├── ui/                     # shadcn/ui components (pre-installed)
│   └── vibe/                   # App-specific components
│       ├── app-shell.tsx       # Main shell: routing, auth, layout
│       ├── bottom-nav.tsx      # Mobile bottom navigation
│       ├── empty-state.tsx     # Empty state placeholder
│       ├── guest-avatars.tsx   # Guest avatar stack
│       ├── host-analytics.tsx  # Host analytics display
│       ├── live-countdown.tsx  # Event countdown timer
│       ├── music-player.tsx    # Music player bar
│       ├── notification-bell.tsx # Notification dropdown
│       ├── party-card.tsx      # Party card (React.memo)
│       ├── rating-pill.tsx     # Rating display pill
│       ├── reviews-section.tsx # Reviews list + submit
│       ├── sidebar-nav.tsx     # Desktop sidebar navigation
│       ├── theme-toggle.tsx    # Dark/light mode toggle
│       ├── user-avatar.tsx     # User avatar (React.memo)
│       └── vibe-badge.tsx      # Vibe tag badge
├── lib/
│   ├── api.ts                  # Client-side API helpers (all endpoints)
│   ├── auto-seed.ts            # Database auto-seeder
│   ├── loading-context.tsx     # Global latency indicator (500ms threshold)
│   ├── mongodb.ts              # MongoDB connection + withDB wrapper
│   ├── music-store.ts          # Music player state (Zustand)
│   ├── music-tracks.ts         # Sample music tracks
│   ├── notifications.ts        # Notification helper (createNotification)
│   ├── store.ts                # Main app store (Zustand + persist)
│   ├── types.ts                # All TypeScript types/interfaces
│   ├── use-chat-socket.ts      # Socket.IO hook for chat
│   ├── use-notifications.ts    # Notification polling + Socket.IO hook
│   └── utils.ts                # Utility functions (cn, etc.)
├── models/                     # Mongoose models
│   ├── ChatThread.ts           # userAId, userBId, partyId, lastMessage
│   ├── GroupChat.ts            # partyId, members[], messages[]
│   ├── JoinRequest.ts          # partyId, requesterId, requesterName, status
│   ├── MenuItem.ts             # partyId, name, price, emoji, category
│   ├── Message.ts              # threadId, senderId, receiverId, content
│   ├── Notification.ts         # userId, type, title, body, read, data
│   ├── Order.ts                # userId, partyId, items[], totalAmount, status
│   ├── Party.ts                # Full party schema with inline host fields
│   ├── PartyMedia.ts           # partyId, url, type, caption
│   ├── PartyView.ts            # partyId, userId, createdAt
│   ├── Review.ts               # partyId, userId, rating, comment
│   ├── SavedParty.ts           # userId, partyId
│   ├── Ticket.ts               # orderId, userId, partyId, qrHash
│   ├── TrustRating.ts          # partyId, hostId, guestId, rating, note
│   ├── User.ts                 # phone, name, role, city, avatar, vibes
│   └── index.ts                # Model exports
├── screens/                    # All 22 app screens
│   ├── admin-screen.tsx
│   ├── chat-screen.tsx
│   ├── confirmation-screen.tsx
│   ├── countdown-screen.tsx
│   ├── create-screen.tsx       # Multi-step party creation form
│   ├── detail-screen.tsx       # Party detail + CTA + reviews + Spotify
│   ├── edit-profile-screen.tsx
│   ├── filter-screen.tsx
│   ├── group-chat-screen.tsx
│   ├── home-screen.tsx         # Main discovery feed
│   ├── host-dashboard-screen.tsx
│   ├── inbox-screen.tsx
│   ├── login-screen.tsx        # OTP login with signup toggle
│   ├── manage-party-screen.tsx
│   ├── map-screen.tsx
│   ├── my-parties-screen.tsx
│   ├── onboarding-screen.tsx   # Role + vibe + city setup
│   ├── payment-screen.tsx
│   ├── profile-screen.tsx
│   ├── requests-screen.tsx
│   ├── saved-screen.tsx
│   └── tickets-screen.tsx
mini-services/
└── chat-service/               # Socket.IO service (port 3003)
    ├── index.ts                # Main server: chat + notification relay
    └── package.json
public/
└── uploads/                    # User uploaded files
```

---

## 4. Authentication Flow

1. **Login Screen**: User enters phone number → API sends OTP → user enters 6-digit OTP
2. **Dev OTP**: In development, OTP is shown in toast + returned in API response
3. **Auth State**: `authed` + `currentUser` + `userRole` in Zustand store (persisted to localStorage)
4. **Initialization**: `AppShell` shows `LoadingScreen` while validating persisted auth via `getUser` API
5. **Onboarding**: After first login, user picks role (host/partier), vibes, and city
6. **Logout**: Clears all auth state + context IDs, redirects to login

### Key Auth Files
- `/src/app/api/auth/otp/route.ts` — OTP send + verify
- `/src/components/vibe/app-shell.tsx` — Auth guard + loading state
- `/src/lib/store.ts` — Zustand store with `login()`, `logout()`, `authed`, `currentUser`

---

## 5. Navigation & Layout

### Screen Routing (Zustand-based, not Next.js routes)
- All navigation happens via `useAppStore().setScreen("screen-name")`
- Screen order defined in `SCREEN_ORDER` array for slide animation direction
- Only `/` route exists (App Router page.tsx renders AppShell)

### Layout Structure
- **Unauthenticated** (login/onboarding): Full-width, centered, max-w-md, no nav
- **Authenticated**: max-w-2xl on mobile, lg:max-w-6xl with sidebar on desktop
- **Bottom Nav**: Mobile only (5 tabs: Home, Map, Create, Saved, Profile)
- **Sidebar Nav**: Desktop only (280px width)

### Auth Flow Detection
```typescript
const isAuthFlow = current === "login" || current === "onboarding";
```

---

## 6. Key Features Implemented

### ✅ Completed
| Feature | Details |
|---|---|
| OTP Auth | Phone + OTP with dev mode showing code |
| Party Discovery | City/vibe/search filtering, radius-based near me |
| Party Creation | Multi-step form (basics → when/where → vibe + Spotify) |
| Join Requests | Request → Accept/Reject workflow with notifications |
| Payment + Tickets | Order creation → ticket with QR hash |
| Realtime Chat | Socket.IO + REST fallback, 1:1 threads |
| Group Chat | Unlocked after first payment for a party |
| Notifications | Socket.IO real-time + 30s polling, NotificationBell dropdown |
| Reviews | Star rating + comment per party |
| Trust Ratings | Host → Guest ratings after events |
| Spotify Integration | Playlist URL field + iframe embed on detail screen |
| Dark/Light Mode | ThemeToggle, next-themes, theme-aware CSS variables |
| Host Dashboard | Simplified: party stats, requests, orders |
| Role Switching | Host ↔ Partier toggle on profile |
| Party Status CTA | Context-aware: "Manage" / "You're in!" / "Request to Join" |
| File Upload | Images (10MB) + Videos (60MB) to /public/uploads |
| Latency Indicator | Global loading indicator after 500ms delay |
| Page Loading | LoadingScreen while validating persisted auth |
| MongoDB Indexes | Optimized compound indexes on all models |
| React.memo | PartyCard, UserAvatar, MessageBubble |
| Mobile Overflow | min-h-[100dvh], max-w-[100vw], overflow-x-hidden on all screens |

---

## 7. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/otp` | Send/verify OTP |
| GET | `/api/parties` | List parties (city, vibe, q, profession, lat/lng/radiusKm) |
| GET | `/api/parties/:id` | Party detail with host info |
| POST | `/api/parties` | Create party |
| GET | `/api/parties/for-you` | Personalized feed |
| POST | `/api/parties/:id/media` | Add media to party |
| DELETE | `/api/parties/:id/media` | Remove media |
| PATCH | `/api/parties/:id/media` | Toggle group chat |
| GET | `/api/requests` | List requests for a party |
| POST | `/api/requests` | Create join request |
| PATCH | `/api/requests/:id` | Accept/reject request |
| GET | `/api/threads` | List user's chat threads |
| GET | `/api/threads/:id` | Thread detail + messages |
| POST | `/api/threads` | Ensure/create thread |
| POST | `/api/messages` | Send message |
| GET | `/api/users` | Get user by phone or id |
| PATCH | `/api/users` | Update user |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications` | Mark all read |
| PATCH | `/api/notifications/:id` | Mark single read |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order + ticket |
| GET | `/api/tickets` | List user's tickets |
| GET | `/api/reviews` | List reviews for party |
| POST | `/api/reviews` | Submit review |
| GET | `/api/saved` | List saved parties |
| POST | `/api/saved` | Toggle saved party |
| GET | `/api/analytics` | Host analytics |
| GET | `/api/menus` | List menu items |
| POST | `/api/menus` | Add menu item |
| DELETE | `/api/menus/:id` | Delete menu item |
| POST | `/api/views` | Record party view |
| GET | `/api/group-chats` | Get group chat |
| POST | `/api/group-chats` | Send group message |
| GET | `/api/trust-ratings` | Get guest trust ratings |
| POST | `/api/trust-ratings` | Create trust rating |
| POST | `/api/upload` | Upload files (multipart) |
| GET | `/api/user-party-status` | Check user's party membership |

---

## 8. Zustand Store Schema

```typescript
interface AppState {
  // Auth
  authed: boolean;
  currentUser: VibeUser | null;
  userRole: 'host' | 'partier';
  login: (u: VibeUser) => void;
  logout: () => void;

  // Onboarding
  onboarded: boolean;

  // Navigation
  screen: Screen;          // Current screen name
  prevScreen: Screen | null;
  setScreen: (s: Screen) => void;
  goBack: () => void;

  // Context IDs
  selectedPartyId: string | null;
  selectedThreadId: string | null;
  selectedOrderId: string | null;

  // Filters
  cityFilter: string | null;
  vibeFilter: string | null;
  searchQuery: string;
  professionFilter: string | null;
  radiusKm: number;         // Default: 10

  // Saved parties
  savedPartyIds: string[];

  // Location
  userLocation: { lat: number; lng: number; label: string } | null;
}

// Persisted fields: savedPartyIds, onboarded, currentUser, authed, userRole, cityFilter, radiusKm, userLocation, professionFilter
```

---

## 9. MongoDB Models & Indexes

### User
- Fields: phone (unique), name, role, city, avatar, vibes[], profession
- Indexes: city, role

### Party
- Fields: title, description, hostId, hostName, hostAvatar, hostRating, hostVerified, city, address, date, time, maxGuests, price, currency, vibes[], spotifyPlaylistUrl, groupChatEnabled, inline host snapshot fields
- Indexes: city+date (compound), hostId+createdAt (compound)

### JoinRequest
- Fields: partyId, requesterId, requesterName, status (pending/accepted/rejected), threadId
- Indexes: partyId+status (compound), partyId, requesterId

### ChatThread
- Fields: userAId, userBId, partyId, lastMessage, lastMessageAt
- Indexes: userAId+userBId (unique compound), updatedAt

### Message
- Fields: threadId, senderId, receiverId, content, read
- Indexes: threadId+createdAt, senderId, receiverId

### Order
- Fields: userId, partyId, items[], totalAmount, status, qrCode
- Indexes: userId, partyId, partyId+status (compound)

### Ticket
- Fields: orderId, userId, partyId, qrHash (unique)
- Indexes: userId, partyId, orderId (unique), qrHash (unique)

### Review
- Fields: partyId, userId, rating, comment
- Indexes: partyId+userId (unique), partyId+createdAt (compound)

### Notification
- Fields: userId, type, title, body, read, data
- Indexes: userId+read+createdAt (compound)

### GroupChat, MenuItem, PartyMedia, PartyView, SavedParty, TrustRating — all with appropriate indexes

---

## 10. Socket.IO Mini-Service

**Location**: `/mini-services/chat-service/index.ts`
**Port**: 3003

### Events
- `join` — Join a user's room for targeted messages
- `chat:message` — Send/receive chat messages
- `notification` — Receive realtime notifications
- HTTP endpoint: `POST /notify` — API-to-socket bridge for notifications

### Frontend Connection
```typescript
io("/?XTransformPort=3003")
```
Caddy gateway proxies WebSocket via `XTransformPort` query parameter.

---

## 11. Important Patterns & Conventions

### withDB Wrapper
All API routes use `withDB` wrapper from `/src/lib/mongodb.ts` for MongoDB connection. It was fixed to forward all arguments (was only forwarding `req`, dropping `params` for dynamic routes).

### Theme System
- CSS variables split into `:root` (light) and `.dark` (dark) in `globals.css`
- Use `bg-background`, `text-foreground`, `bg-card`, `border-border` etc. (never hardcoded colors)
- Login/onboarding intentionally keep hardcoded dark colors
- ThemeToggle uses `useSyncExternalStore` for hydration-safe mounted detection

### Mobile Overflow Prevention
- All screens: `min-h-[100dvh] max-w-[100vw] overflow-x-hidden`
- Scrollable flex children: `min-h-0` (critical for preventing y-axis overflow)
- Content areas: `overflow-x-hidden`

### API Request Tracking
- `jfetch` wrapper in `/src/lib/api.ts` automatically tracks request start/end
- `LoadingProvider` in `/src/lib/loading-context.tsx` shows indicator after 500ms
- Upload and raw fetch calls also tracked via `trackRequestStart/End`

### Auto-Repair on Startup
- `repairHostIntegrity()` in auto-seed.ts fixes broken hostId references
- Inline host snapshot fields on Party document prevent "host not found" errors

---

## 12. Pending / Requested Features (NOT YET IMPLEMENTED)

### From Latest User Messages (Priority Order)

1. **Fix app not opening** — Dev server was down, needs restart + verification
2. **Login page redesign** — User says "worst, make from beginning"
3. **View party under tickets not working** — Ticket detail/view broken
4. **Reviews only when person is in party** — Restrict reviews to accepted members
5. **Profile simplification** — Remove unnecessary features/settings
6. **Show real people names and images** — After payment show real names; before payment only partial
7. **Auto-play host's playlist** — When viewing party detail, auto-play Spotify after few seconds
8. **Remove settings** — No settings page exists, remove the link
9. **Remove white mode** — Remove light theme toggle, keep dark only
10. **Cleanup operation** — After event ends, media files removed after 1 week; show "cleaned storage" message
11. **User playlist in music tab** — Users can add their own playlist, save it, auto-play on page load
12. **Remove all page animations** — Remove Framer Motion animations for instant response
13. **Fetch only on tab switch** — Only fetch new data when tabs switch, not on every render
14. **Current location recommendations** — Show nearby events when user signs in
15. **Map highlighted area** — Show colored area where event is happening, never full location before payment
16. **Upload limit 5MB for host reviews** — Limit review uploads by host to 5MB
17. **Professional look** — Overall UI polish
18. **Hamburger menu for mobile** — Move overlapping options to hamburger menu
19. **Fix overflowing components** — Reiterate every component for overflow issues

### Older Pending Items
- Fix "host not found" error (mitigated but may recur)
- Fix paid guest list showing incorrect names (partially fixed)
- Photos on event posts + pagination (10 per page)
- Lazy loading throughout app
- Area hiding + Google Maps integration
- Messaging restriction: Only after host accepts spot request
- UI redesign: premium black/dark theme

---

## 13. Known Issues & Risks

| Issue | Severity | Status |
|---|---|---|
| App not opening (dev server down) | Critical | Needs restart |
| Login page UI poor quality | High | Needs complete redesign |
| Ticket view party not working | High | Needs debugging |
| Mobile options overlap | High | Needs hamburger menu |
| Overflow on some components | Medium | Partially fixed, may recur |
| Upload files stored locally | Medium | Production needs S3/cloud |
| No pagination on notifications | Low | Scalability concern |
| Framer Motion animations cause delay | Medium | User wants them removed |
| Light mode partially broken | Medium | User wants it removed entirely |

---

## 14. Dev Commands

```bash
# Start dev server
bun run dev

# Run lint
bun run lint

# Push MongoDB schema changes
bun run db:push

# Push to GitHub
git push vibematch main

# Check dev server log
tail -50 /home/z/my-project/dev.log

# Start mini-service (Socket.IO)
cd mini-services/chat-service && bun run dev
```

---

## 15. File Change Hotspots

These files are modified most frequently and are most likely to cause issues:

1. **`/src/components/vibe/app-shell.tsx`** — Auth flow, loading, layout
2. **`/src/screens/login-screen.tsx`** — Login UI (user keeps requesting changes)
3. **`/src/screens/detail-screen.tsx`** — Party detail, CTA, reviews, Spotify
4. **`/src/screens/home-screen.tsx`** — Discovery feed, filters, notifications
5. **`/src/screens/profile-screen.tsx`** — Profile, theme toggle, role switch
6. **`/src/app/globals.css`** — CSS variables, animations, theme support
7. **`/src/lib/api.ts`** — API client with loading tracking
8. **`/src/lib/store.ts`** — Zustand store with persistence
9. **`/src/app/api/parties/route.ts`** — Party CRUD
10. **`/src/app/api/requests/route.ts`** — Join request handling

---

## 16. Caddy Gateway Rules

- External port 81 → Next.js port 3000
- For cross-port API requests, use `?XTransformPort=PORT` query parameter
- WebSocket connections: `io("/?XTransformPort=3003")`
- NEVER use `http://localhost:PORT` in frontend code — always use relative paths with XTransformPort

---

## 17. Environment Variables (.env)

```
MONGODB_URI=See .env file (MONGODB_URI)
```

---

*End of VibeMatch Context Document*
