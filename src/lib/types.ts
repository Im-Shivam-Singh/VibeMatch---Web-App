// Shared VibeMatch types and constants

export const CITIES = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Goa",
  "Pune",
] as const;

export type City = (typeof CITIES)[number];

export const VIBE_TAGS = [
  "Techno",
  "Bollywood",
  "BYOB",
  "Boardgames",
  "Lo-fi",
  "Chill",
  "EDM",
  "Retro",
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

export const VIBE_EMOJI: Record<string, string> = {
  Techno: "🎧",
  Bollywood: "🎬",
  BYOB: "🍾",
  Boardgames: "🎲",
  "Lo-fi": "🌙",
  Chill: "🧊",
  EDM: "⚡",
  Retro: "📼",
};

export const VIBE_COLORS: Record<string, string> = {
  Techno: "from-fuchsia-500/20 to-purple-500/20 text-fuchsia-200 border-fuchsia-500/30",
  Bollywood: "from-amber-500/20 to-rose-500/20 text-amber-200 border-amber-500/30",
  BYOB: "from-emerald-500/20 to-teal-500/20 text-emerald-200 border-emerald-500/30",
  Boardgames: "from-cyan-500/20 to-blue-500/20 text-cyan-200 border-cyan-500/30",
  "Lo-fi": "from-indigo-500/20 to-violet-500/20 text-indigo-200 border-indigo-500/30",
  Chill: "from-sky-500/20 to-cyan-500/20 text-sky-200 border-sky-500/30",
  EDM: "from-pink-500/20 to-fuchsia-500/20 text-pink-200 border-pink-500/30",
  Retro: "from-orange-500/20 to-amber-500/20 text-orange-200 border-orange-500/30",
};

export interface Party {
  id: string;
  title: string;
  city: string;
  area: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  fee: number;
  maxGuests: number;
  vibes: string; // comma separated
  description: string;
  hostName: string;
  hostId?: string | null;
  coverUrl?: string | null;
  guestCount: number;
  createdAt: string;
}

export interface PartyCreateInput {
  title: string;
  city: string;
  area: string;
  date: string;
  time: string;
  fee: number;
  maxGuests: number;
  vibes: string[];
  description: string;
  hostName: string;
  coverUrl?: string;
}

export interface JoinRequest {
  id: string;
  partyId: string;
  requesterName: string;
  introMessage: string;
  status: "pending" | "accepted" | "rejected";
  requesterId?: string | null;
  createdAt: string;
}

export interface JoinRequestInput {
  partyId: string;
  requesterName: string;
  introMessage: string;
}

export interface VibeUser {
  id: string;
  name: string;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  instagram?: string | null;
  vibePrefs?: string; // comma-separated vibe tag prefs (from onboarding)
  vibes: number;
  hosted: number;
  rating: number;
  ratingCount: number;
}

export interface ChatThread {
  id: string;
  userAId: string;
  userBId: string;
  partyId?: string | null;
  createdAt: string;
  updatedAt: string;
  // joined for UI convenience
  otherUser?: VibeUser;
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

// Party review — submitted by guests after attending
export interface PartyReview {
  id: string;
  partyId: string;
  userId: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
  // joined for UI
  user?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

// Host analytics summary
export interface HostAnalytics {
  hostId: string;
  totalViews: number;
  partyCount: number;
  totalGuests: number;
  totalCapacity: number;
  totalRequests: number;
  acceptedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  acceptanceRate: number; // 0..100
  avgRating: number; // 0..5
  reviewCount: number;
  topParties: {
    partyId: string;
    title: string;
    views: number;
    requests: number;
    guests: number;
    capacity: number;
  }[];
}

// Map cluster summary — for the map view
export interface PartyCluster {
  city: string;
  count: number;
  parties: Party[];
}

export type Screen =
  | "login"
  | "onboarding"
  | "home"
  | "create"
  | "detail"
  | "inbox"
  | "chat"
  | "profile"
  | "edit-profile"
  | "my-parties"
  | "requests"
  | "saved"
  | "map";

export function parseVibes(vibes: string): string[] {
  if (!vibes) return [];
  return vibes
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function formatFee(fee: number): string {
  if (fee === 0) return "Free";
  return `₹${fee}`;
}

export function formatDateLabel(date: string): string {
  // date: yyyy-mm-dd
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  // time: HH:mm (24h) -> 9:30 PM
  const [hStr, m] = time.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m} ${ampm}`;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function slotsLeft(maxGuests: number, guestCount: number): number {
  return Math.max(0, maxGuests - guestCount);
}

// Status of a party relative to now: live / upcoming / today / past
export type PartyLiveStatus = "live" | "starting-soon" | "today" | "upcoming" | "past";

export function partyLiveStatus(date: string, time: string, durationHours = 4): PartyLiveStatus {
  // date: yyyy-mm-dd, time: HH:mm
  const start = new Date(`${date}T${time || "00:00"}:00`);
  const end = new Date(start.getTime() + durationHours * 3_600_000);
  const now = new Date();

  const d = new Date(date + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (now >= start && now <= end) return "live";
  if (dayDiff < 0 || now > end) return "past";
  if (dayDiff === 0) {
    // today: starting soon if within 2h
    const msToStart = start.getTime() - now.getTime();
    if (msToStart > 0 && msToStart <= 2 * 3_600_000) return "starting-soon";
    return "today";
  }
  return "upcoming";
}

// Returns a humanized countdown string e.g. "in 2h 15m", "starts in 3d", "Live now"
export function countdownTo(date: string, time: string, durationHours = 4): string {
  const start = new Date(`${date}T${time || "00:00"}:00`);
  const end = new Date(start.getTime() + durationHours * 3_600_000);
  const now = new Date();

  if (now >= start && now <= end) return "Live now";
  if (now > end) return "Ended";

  const ms = start.getTime() - now.getTime();
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  if (mins > 0) return `in ${mins}m`;
  return "starting";
}

// Map a city name to approximate lat/lng for the stylized map view.
export const CITY_COORDS: Record<string, { x: number; y: number }> = {
  Delhi: { x: 0.42, y: 0.28 },
  Mumbai: { x: 0.22, y: 0.62 },
  Bangalore: { x: 0.36, y: 0.85 },
  Goa: { x: 0.18, y: 0.78 },
  Pune: { x: 0.26, y: 0.68 },
};

// Deterministic small jitter per party id so pins don't perfectly overlap
export function partyPinOffset(seed: string, city: string): { x: number; y: number } {
  const base = CITY_COORDS[city] || { x: 0.5, y: 0.5 };
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const jx = ((h % 60) - 30) / 600; // -0.05..+0.05
  const jy = (((h >> 4) % 60) - 30) / 600;
  return { x: base.x + jx, y: base.y + jy };
}

// Demo guest avatars used for the "who's going" social-proof stack.
// In production this would come from RSVP records.
export const GUEST_AVATARS = [
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
];

export function pickGuestAvatars(seed: string, count: number): string[] {
  // deterministic pick based on seed string
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: string[] = [];
  for (let i = 0; i < Math.min(count, GUEST_AVATARS.length); i++) {
    out.push(GUEST_AVATARS[(h + i * 7) % GUEST_AVATARS.length]);
  }
  return out;
}
