// Shared VibeMatch types and constants

// Multi-region: UK + India (spec says "Works across UK and India from day one")
export const CITIES = [
  "Edinburgh",
  "London",
  "Manchester",
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Goa",
  "Pune",
] as const;

export type City = (typeof CITIES)[number];

export const REGIONS: Record<string, "UK" | "India"> = {
  Edinburgh: "UK",
  London: "UK",
  Manchester: "UK",
  Delhi: "India",
  Mumbai: "India",
  Bangalore: "India",
  Goa: "India",
  Pune: "India",
};

export function currencyForCity(city: string): "£" | "₹" {
  return REGIONS[city] === "UK" ? "£" : "₹";
}

export const VIBE_TAGS = [
  "R&B",
  "Bollywood",
  "BYOB",
  "Games",
  "Lo-fi",
  "Chill",
  "EDM",
  "Retro",
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

export const VIBE_EMOJI: Record<string, string> = {
  "R&B": "🎵",
  Bollywood: "🌿",
  BYOB: "🍾",
  Games: "🎮",
  "Lo-fi": "🌙",
  Chill: "🧊",
  EDM: "⚡",
  Retro: "📼",
};

// Vibe tag colors — multi-color palette (per spec): each vibe gets its own
// tinted chip so the feed reads as varied, not monochrome.
export const VIBE_COLORS: Record<string, string> = {
  "R&B": "bg-purple-500/15 text-purple-300 border-purple-500/45",
  Bollywood: "bg-green-600/15 text-green-400 border-green-600/45",
  BYOB: "bg-purple-500/15 text-purple-300 border-purple-500/45",
  Games: "bg-teal-500/15 text-teal-300 border-teal-500/45",
  "Lo-fi": "bg-purple-500/15 text-purple-300 border-purple-500/45",
  Chill: "bg-cyan-500/15 text-cyan-300 border-cyan-500/45",
  EDM: "bg-coral-500/15 text-coral-300 border-coral-500/45",
  Retro: "bg-rose-500/15 text-rose-300 border-rose-500/45",
};

// Profession enum (for the filter screen "Who are you?")
export const PROFESSIONS = [
  "Student",
  "Software eng.",
  "Designer",
  "Healthcare",
  "Finance",
  "Other",
] as const;
export type Profession = (typeof PROFESSIONS)[number];

export interface PartyMedia {
  id: string;
  partyId: string;
  url: string;
  type: "image" | "video";
  caption: string;
  position: number;
  createdAt: string;
}

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
  lat?: number | null;
  lng?: number | null;
  guestCount: number;
  // Host controls (spec slide 9)
  approvalRequired?: boolean;
  acceptJoiners?: boolean;
  menuOpen?: boolean;
  // Security/bouncer booking add-on
  securityBooked?: boolean;
  securityFee?: number;
  securityStatus?: string;
  locationRevealAt?: string | null; // ISO datetime when exact address drops
  createdAt: string;
  // Media gallery — full list (image + video). Empty in list payloads,
  // populated on the GET /api/parties/[id] route.
  media?: PartyMedia[];
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
  lat?: number;
  lng?: number;
  securityBooked?: boolean;
  securityFee?: number;
  media?: { url: string; type: "image" | "video"; caption?: string }[];
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
  profession?: string | null;
  vibes: number;
  hosted: number;
  rating: number;
  ratingCount: number;
  // Guest TRUST score — avg of trust ratings given by hosts (1..5)
  trustScore?: number;
  trustCount?: number;
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

// ===== Menu / Drinks / Orders / Tickets (new in app-flow spec) =====

export interface MenuItem {
  id: string;
  partyId: string;
  name: string;
  price: number;
  emoji: string;
  category: "drink" | "snack" | "soft";
  createdAt: string;
}

export interface MenuItemInput {
  partyId: string;
  name: string;
  price: number;
  emoji: string;
  category: "drink" | "snack" | "soft";
}

// Order = a guest's confirmed purchase for a party (entry + optional add-ons)
export interface Order {
  id: string;
  userId: string;
  partyId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: "£" | "₹";
  status: "pending" | "paid" | "refunded";
  stripePaymentId?: string | null;
  createdAt: string;
  // joined
  party?: Party;
  ticket?: Ticket;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null; // null for the entry ticket itself
  name: string;
  emoji: string;
  unitPrice: number;
  quantity: number;
}

// Ticket = QR-validated door entry tied to a paid order
export interface Ticket {
  id: string;
  orderId: string;
  userId: string;
  partyId: string;
  qrHash: string;
  scannedAt?: string | null;
  scannedById?: string | null;
  createdAt: string;
  // joined
  party?: Party;
  order?: Order;
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
  | "filter"
  | "create"
  | "detail"
  | "payment"
  | "confirmation"
  | "countdown"
  | "tickets"
  | "inbox"
  | "chat"
  | "profile"
  | "edit-profile"
  | "my-parties"
  | "host-dashboard"
  | "admin"
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

export function formatFee(fee: number, city?: string): string {
  if (fee === 0) return "Free";
  const sym = city ? currencyForCity(city) : "£";
  return `${sym}${fee}`;
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
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
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
  Edinburgh: { x: 0.30, y: 0.30 },
  London: { x: 0.35, y: 0.45 },
  Manchester: { x: 0.28, y: 0.38 },
  Delhi: { x: 0.62, y: 0.28 },
  Mumbai: { x: 0.55, y: 0.62 },
  Bangalore: { x: 0.58, y: 0.85 },
  Goa: { x: 0.50, y: 0.78 },
  Pune: { x: 0.56, y: 0.68 },
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
export const GUEST_AVATARS = [
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
];

export function pickGuestAvatars(seed: string, count: number): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: string[] = [];
  for (let i = 0; i < Math.min(count, GUEST_AVATARS.length); i++) {
    out.push(GUEST_AVATARS[(h + i * 7) % GUEST_AVATARS.length]);
  }
  return out;
}


// ===== Geographic helpers for the local map view =====

// Real lat/lng centers for each city — UK + India
export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Edinburgh: { lat: 55.9533, lng: -3.1883 },
  London: { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Goa: { lat: 15.2993, lng: 74.124 },
  Pune: { lat: 18.5204, lng: 73.8567 },
};

// Haversine distance in kilometres between two lat/lng points.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // earth radius, km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Project a lat/lng to viewport pixels relative to a center point using
// an equirectangular approximation (good enough for a few-km view).
export function projectLatLng(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  pixelsPerKm: number,
): { x: number; y: number } {
  const dxKm = haversineKm(
    { lat: center.lat, lng: center.lng },
    { lat: center.lat, lng: point.lng },
  ) * (point.lng < center.lng ? -1 : 1);
  const dyKm = haversineKm(
    { lat: center.lat, lng: center.lng },
    { lat: point.lat, lng: center.lng },
  ) * (point.lat < center.lat ? 1 : -1);
  return { x: dxKm * pixelsPerKm, y: dyKm * pixelsPerKm };
}

// ===== "Fun score" — drives the animation intensity on map pins =====
// 0..100. Combines crowd fill, vibe variety, live status, and free entry.

export type FunTier = "low" | "warm" | "lively" | "lit";

export function funScore(p: {
  guestCount: number;
  maxGuests: number;
  vibes: string;
  date: string;
  time: string;
  fee: number;
}): number {
  const fillRatio =
    p.maxGuests > 0 ? Math.min(1, p.guestCount / p.maxGuests) : 0;
  const crowd = fillRatio * 50;
  const vibeCount = parseVibes(p.vibes).length;
  const vibeScore = Math.min(20, vibeCount * 5);
  const status = partyLiveStatus(p.date, p.time);
  const liveBonus =
    status === "live"
      ? 25
      : status === "starting-soon"
        ? 18
        : status === "today"
          ? 10
          : 0;
  const freeBonus = p.fee === 0 ? 5 : 0;
  return Math.round(crowd + vibeScore + liveBonus + freeBonus);
}

export function funTier(score: number): FunTier {
  if (score >= 80) return "lit";
  if (score >= 60) return "lively";
  if (score >= 35) return "warm";
  return "low";
}

// Tier metadata — multi-color (per spec):
//   low    → faint purple, gentle breathing
//   warm   → amber, soft pulsing
//   lively → teal, bouncy
//   lit    → purple-bright, energetic + sparkle ring
export const FUN_TIER_META: Record<
  FunTier,
  {
    label: string;
    ringClass: string;
    animClass: string;
    glowClass: string;
    dotClass: string;
    textClass: string;
    chipClass: string;
    sparkClass: string;
  }
> = {
  low: {
    label: "Low-key",
    ringClass: "border-purple-500/50",
    animClass: "fun-breathe",
    glowClass: "shadow-[0_0_12px_-3px_rgba(83,74,183,0.45)]",
    dotClass: "bg-purple-500/70",
    textClass: "text-purple-300",
    chipClass: "bg-purple-500/10 text-purple-300 border-purple-500/40",
    sparkClass: "bg-purple-400",
  },
  warm: {
    label: "Warming up",
    ringClass: "border-amber-500/65",
    animClass: "fun-pulse",
    glowClass: "shadow-[0_0_16px_-3px_rgba(239,159,39,0.6)]",
    dotClass: "bg-amber-500",
    textClass: "text-amber-300",
    chipClass: "bg-amber-500/15 text-amber-300 border-amber-500/50",
    sparkClass: "bg-amber-400",
  },
  lively: {
    label: "Lively",
    ringClass: "border-teal-500/80",
    animClass: "fun-bounce",
    glowClass: "shadow-[0_0_20px_-3px_rgba(29,158,117,0.8)]",
    dotClass: "bg-teal-500",
    textClass: "text-teal-300",
    chipClass: "bg-teal-500/20 text-teal-200 border-teal-500/60",
    sparkClass: "bg-teal-400",
  },
  lit: {
    label: "Lit 🔥",
    ringClass: "border-purple-400",
    animClass: "fun-lit",
    glowClass: "shadow-[0_0_24px_-2px_rgba(127,119,221,0.95)]",
    dotClass: "bg-purple-400",
    textClass: "text-purple-200",
    chipClass: "bg-purple-500/25 text-purple-100 border-purple-400",
    sparkClass: "bg-purple-300",
  },
};

// Pick a deterministic small offset within a city for parties without
// explicit lat/lng.
export function partyGeoFallback(
  seed: string,
  city: string,
): { lat: number; lng: number } {
  const center = CITY_CENTERS[city] ?? { lat: 55.9533, lng: -3.1883 };
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dLat = ((h % 800) - 400) / 10000; // -0.04..+0.04
  const dLng = (((h >> 8) % 800) - 400) / 10000;
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

// Resolve a party's coordinates — uses stored lat/lng if present, else fallback.
export function partyCoords(p: {
  lat?: number | null;
  lng?: number | null;
  id: string;
  city: string;
}): { lat: number; lng: number } {
  if (typeof p.lat === "number" && typeof p.lng === "number") {
    return { lat: p.lat, lng: p.lng };
  }
  return partyGeoFallback(p.id, p.city);
}
