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
[![CI](https://github.com/your-org/vibematch/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/vibematch/actions/workflows/ci.yml)

**[🌐 Live Demo](https://vibematch.vercel.app)** · **[📖 Documentation](#)** · **[🐛 Report Bug](https://github.com/your-org/vibematch/issues)** · **[✨ Request Feature](https://github.com/your-org/vibematch/issues)**

</div>

---

## 📸 Screenshots

<div align="center">

| 🏠 Home Feed | 🔍 Explore & Filter | 💬 Real-time Chat |
|:---:|:---:|:---:|
| *[Home feed with party cards]* | *[Filter by city & vibe]* | *[Socket.io powered chat]* |

| 🎟️ Tickets & QR | 📊 Host Dashboard | 🗺️ Map View |
|:---:|:---:|:---:|
| *[Ticket with QR code]* | *[Analytics & revenue]* | *[Interactive map pins]* |

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

## 🏗️ Project Architecture

VibeMatch follows a **monolithic Next.js architecture** with a separate micro-service for real-time features:

```
┌──────────────────────────────────────────────────────┐
│                   Next.js App (:3000)                │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Single Page │  │  API Routes  │  │  Prisma +   │ │
│  │  App (SPA)   │  │  (/api/*)    │  │  SQLite     │ │
│  │              │  │              │  │             │ │
│  │ Zustand for  │  │ RESTful      │  │ 15+ models  │ │
│  │ navigation & │  │ endpoints    │  │ Party, User │ │
│  │ UI state     │  │ for CRUD     │  │ Chat, Order │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┘ │
│         │                 │                           │
└─────────┼─────────────────┼───────────────────────────┘
          │                 │
          │    ┌────────────┴──────────────┐
          │    │  Socket.io Chat Service   │
          └───▶│  (:3003)                  │
               │  Real-time messaging &    │
               │  group chat with          │
               │  referral offers          │
               └───────────────────────────┘
```

### Key Design Decisions

- **Single `/` route** — The entire app lives on one page; screen transitions are managed via Zustand state, not URL routing. This enables smooth mobile transitions without page reloads.
- **API Routes** — Next.js Route Handlers at `/api/*` provide the backend. No separate backend server needed for CRUD operations.
- **Socket.io micro-service** — Runs on port 3003 for persistent WebSocket connections required by real-time chat. Deployed separately from the serverless Next.js app.
- **Prisma + SQLite** — Zero-config database perfect for development. For production, migrate to a hosted database (Vercel Postgres, Turso, Neon).
- **TanStack Query** — Handles all server state (fetching, caching, revalidation) while Zustand manages client-side UI state (current screen, filters, music player).

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

# Copy environment variables
cp .env.example .env

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

## 🔐 Environment Variables

Create a `.env` file in the project root (see `.env.example` for a template):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite connection string, e.g. `file:./dev.db` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of the app (used for CORS, OG images). e.g. `http://localhost:3000` in dev |
| `NEXT_PUBLIC_API_URL` | ⬜ | Base URL for API calls. Defaults to `NEXT_PUBLIC_APP_URL/api` |
| `NEXT_PUBLIC_SOCKET_URL` | ⬜ | URL for the Socket.io chat service. e.g. `http://localhost:3003` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | ⬜ | Google Maps API key for map features (Leaflet used as fallback) |

### Example `.env`

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3003"
```

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
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline (lint, typecheck, build)
│       └── deploy.yml          # Vercel deployment pipeline
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

### Deploying to Vercel (Recommended)

VibeMatch is optimized for [Vercel](https://vercel.com/) deployment. Follow these steps:

#### 1. Prepare Your Repository

```bash
# Ensure all changes are committed and pushed
git push origin main
```

#### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select **"Import Git Repository"**
3. Choose your VibeMatch fork/repo
4. Vercel will auto-detect Next.js — no framework configuration needed

#### 3. Configure Environment Variables

In the Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your production database connection string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://your-app.vercel.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | URL of your deployed chat service |

> **⚠️ Important:** SQLite does not work on Vercel's serverless platform. For production, use a hosted database like:
> - [Vercel Postgres](https://vercel.com/storage/postgres)
> - [Turso](https://turso.tech/) (SQLite-compatible edge database)
> - [Neon](https://neon.tech/) (serverless Postgres)
> - [PlanetScale](https://planetscale.com/) (serverless MySQL)

#### 4. Deploy

Click **"Deploy"** — Vercel will build and deploy automatically. Every push to `main` triggers a production deployment.

#### 5. Deploy the Chat Service Separately

The Socket.io chat micro-service requires persistent WebSocket connections and cannot run on serverless. Deploy it to a container platform:

```bash
# Example: Deploy to Railway
cd mini-services/chat-service
railway init
railway up
```

Supported platforms: **Railway**, **Fly.io**, **Render**, **DigitalOcean App Platform**

#### 6. Configure GitHub Actions (Optional)

For automated deployments via CI/CD, set these GitHub secrets:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## 🗺️ Roadmap

We're constantly improving VibeMatch. Here's what's coming next:

- 🔔 **Push Notifications** — Real-time alerts for party updates, chat messages, and ticket confirmations
- 💳 **Payment Integration** — Stripe and Razorpay support for ticket purchases and host payouts
- 🤖 **AI-Powered Recommendations** — Smart party suggestions based on vibe preferences, past attendance, and social graph
- ✅ **Host Verification** — KYC-like verification system for hosts with badges and trust indicators
- 📱 **Social Media Integration** — Share parties on Instagram, WhatsApp, and Twitter; import friend lists
- 🌍 **Multi-language Support** — i18n for Hindi, Spanish, Portuguese, and more
- 📊 **Advanced Analytics** — Deeper host insights with attendance trends, revenue forecasting, and audience demographics
- 🎮 **Gamification** — Badges, streaks, and leaderboards for active party-goers
- 🛡️ **Enhanced Safety** — In-app emergency contacts, location sharing, and incident reporting

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
- CI checks (lint, type check, build) must pass before merging

---

## 🙏 Credits & Acknowledgments

- **[Next.js](https://nextjs.org/)** — The React framework for production
- **[shadcn/ui](https://ui.shadcn.com/)** — Beautifully designed UI components
- **[Prisma](https://www.prisma.io/)** — Next-generation ORM for Node.js & TypeScript
- **[Socket.io](https://socket.io/)** — Real-time bidirectional event-based communication
- **[Zustand](https://zustand-demo.pmnd.rs/)** — Bear necessities for state management
- **[TanStack Query](https://tanstack.com/query/)** — Powerful asynchronous state management
- **[Framer Motion](https://www.framer.com/motion/)** — Production-ready motion library for React
- **[Leaflet](https://leafletjs.com/)** — Open-source interactive maps
- **[Recharts](https://recharts.org/)** — Composable charting library built on React components
- **[Vercel](https://vercel.com/)** — Platform for frontend frameworks and static sites

### Contributors

Thanks to all the amazing people who have contributed to VibeMatch!

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/your-org"><img src="https://via.placeholder.com/100" width="50px;" alt=""/><br /><sub><b>VibeMatch Team</b></sub></a></td>
  </tr>
</table>
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with 💜 by the VibeMatch team

**[⬆ Back to Top](#-vibematch)**

</div>
