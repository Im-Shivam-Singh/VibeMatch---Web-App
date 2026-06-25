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

export type Screen =
  | "login"
  | "home"
  | "create"
  | "detail"
  | "inbox"
  | "chat"
  | "profile"
  | "edit-profile"
  | "my-parties"
  | "requests";

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
