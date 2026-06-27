<div align="center">

# 🎉 VibeMatch

### Find Your Night Out

A mobile-first PWA for discovering local house parties & social meetups,
connecting with hosts, and building your perfect night out.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel)](https://vercel.com/)

</div>

---

## ✨ Features

- 🔍 **Discover** local house parties & social meetups near you
- 🎵 **Vibe-based filtering** — R&B, Bollywood, BYOB, Games, Lo-fi, Chill, EDM, Retro
- 📍 **City-based exploration** — Edinburgh, London, Manchester, Delhi, Mumbai, Bangalore, Goa, Pune
- 💬 **Real-time group chat** powered by Socket.io
- 🎟️ **Ticket booking** with live countdown timers
- 🏠 **Host dashboard** with analytics, guest management & trust ratings
- ⭐ **Trust ratings & reviews** — hosts rate guests, guests review parties
- 🎵 **In-app music player** with vibe-matched tracks
- 📱 **Mobile-first PWA** — dark neon theme, 480px container, bottom navigation
- 🗺️ **Interactive map view** with fun-score animated pins
- 🍔 **In-app menu ordering** — drinks, snacks & add-ons
- 🔐 **Security add-on** — optional bouncer booking for hosts
- 🎁 **Referral offers** — integrated brand deals inside group chat (Swiggy, Zomato, Blinkit, etc.)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Prisma ORM (SQLite) |
| **State** | Zustand (client) + TanStack Query (server) |
| **Real-time** | Socket.io (chat service on port 3003) |
| **Animations** | Framer Motion |
| **Maps** | Leaflet |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- SQLite (bundled with Prisma)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/vibematch.git
cd vibematch

# Install dependencies
bun install

# Push the database schema
bun run db:push

# (Optional) Seed demo data
bun run scripts/seed.ts

# Start the dev server
bun run dev
```

The app runs at **http://localhost:3000** and the chat micro-service at **ws://localhost:3003**.

### Useful Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start development server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run db:push` | Push Prisma schema to DB |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:reset` | Reset DB & re-seed |
| `bun run lint` | Lint with ESLint |

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema (15+ models)
├── public/
│   ├── manifest.webmanifest    # PWA manifest
│   ├── uploads/                # User-uploaded media
│   └── logo.svg
├── scripts/
│   ├── seed.ts                 # Main seed script
│   ├── seed-uk.ts              # UK-specific demo data
│   ├── seed-geo.ts             # Geographic coordinates
│   └── backfill-media.ts       # Media backfill utility
├── src/
│   ├── app/
│   │   ├── api/                # Route handlers (see below)
│   │   ├── globals.css         # Global styles & theme
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Single-page app entry
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (40+)
│   │   └── vibe/               # App-specific components
│   │       ├── app-shell.tsx
│   │       ├── bottom-nav.tsx
│   │       ├── party-card.tsx
│   │       ├── music-player.tsx
│   │       ├── host-analytics.tsx
│   │       ├── live-countdown.tsx
│   │       ├── reviews-section.tsx
│   │       └── ...
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── api.ts              # TanStack Query hooks
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── music-store.ts      # Zustand music state
│   │   ├── music-tracks.ts     # Vibe-matched playlists
│   │   ├── store.ts            # Main Zustand store
│   │   ├── types.ts            # Shared types & constants
│   │   ├── use-chat-socket.ts  # Socket.io hook
│   │   └── utils.ts            # Utility functions
│   └── screens/                # All 22 app screens
│       ├── home-screen.tsx
│       ├── detail-screen.tsx
│       └── ...
├── mini-services/
│   └── chat-service/           # Socket.io micro-service
└── package.json
```

---

## 🔌 API Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api` | Health check |
| `GET` / `POST` | `/api/parties` | List / create parties |
| `GET` | `/api/parties/for-you` | Personalised party feed |
| `GET` / `PUT` / `DELETE` | `/api/parties/[id]` | Get / update / delete a party |
| `POST` | `/api/parties/[id]/media` | Upload party media |
| `GET` / `POST` | `/api/requests` | List / create join requests |
| `PUT` | `/api/requests/[id]` | Accept / reject a request |
| `GET` / `POST` | `/api/threads` | List / create chat threads |
| `GET` | `/api/threads/[id]` | Get thread with messages |
| `GET` / `POST` | `/api/messages` | List / send messages |
| `GET` / `POST` | `/api/users` | List / create users |
| `POST` | `/api/auth/otp` | OTP-based auth |
| `GET` / `POST` | `/api/saved` | List / toggle saved parties |
| `GET` / `POST` | `/api/reviews` | List / create reviews |
| `GET` / `POST` | `/api/analytics` | Host analytics data |
| `GET` / `POST` | `/api/menus` | List / create menu items |
| `PUT` / `DELETE` | `/api/menus/[id]` | Update / delete menu item |
| `GET` / `POST` | `/api/orders` | List / create orders |
| `GET` / `POST` | `/api/tickets` | List / create tickets |
| `POST` | `/api/upload` | Upload media files |
| `GET` / `POST` | `/api/trust-ratings` | List / create trust ratings |
| `GET` / `POST` | `/api/group-chats` | List / create group chats |
| `POST` | `/api/views` | Track party views |

---

## 📱 Screens

| # | Screen | Description |
|---|---|---|
| 1 | 🔐 `login` | Phone + OTP authentication |
| 2 | 🎯 `onboarding` | Vibe & city preference setup |
| 3 | 🏠 `home` | Party feed with For You / All tabs |
| 4 | 🔍 `filter` | City, vibe, profession & radius filters |
| 5 | ➕ `create` | Host a new party |
| 6 | 📋 `detail` | Full party details with media gallery |
| 7 | 💳 `payment` | Checkout with menu add-ons |
| 8 | ✅ `confirmation` | Order confirmed + QR ticket |
| 9 | ⏱️ `countdown` | Live countdown to party start |
| 10 | 🎟️ `tickets` | My tickets & QR codes |
| 11 | 💬 `inbox` | Chat thread list |
| 12 | 💭 `chat` | 1-on-1 chat with host |
| 13 | 👤 `profile` | User profile with trust score |
| 14 | ✏️ `edit-profile` | Edit name, bio, socials |
| 15 | 🎉 `my-parties` | Hosted & attended parties |
| 16 | 📊 `host-dashboard` | Analytics, requests & revenue |
| 17 | 🛡️ `admin` | Party management controls |
| 18 | 📨 `requests` | Incoming join requests |
| 19 | ❤️ `saved` | Saved / liked parties |
| 20 | 🗺️ `map` | Interactive city map with pins |
| 21 | ⚙️ `manage-party` | Host manage party screen |
| 22 | 👥 `group-chat` | Party group chat + referral offers |

---

## 🚢 Deployment

VibeMatch is built for [Vercel](https://vercel.com/) deployment:

1. Push to your GitHub repository
2. Import the repo in Vercel
3. Set `DATABASE_URL` environment variable
4. Deploy — Vercel auto-detects Next.js

The Socket.io chat service can be deployed separately as a serverless function or on a persistent container (Railway, Fly.io, etc.).

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines

- Follow the existing code style (TypeScript strict mode, Tailwind classes)
- Keep screens in `src/screens/` and components in `src/components/vibe/`
- Use Zustand for client state, TanStack Query for server state
- Write descriptive commit messages
- Test your changes with `bun run dev` before pushing

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with 💜 by the VibeMatch team

</div>
