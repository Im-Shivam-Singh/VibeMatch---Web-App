// Ambient, copyright-free music tracks for the VibeMatch in-app music player.
// All tracks are SoundHelix's royalty-free electronic instrumental cuts
// (https://www.soundhelix.com) — CC-friendly, hotlink-safe, and reliable.
// Users can vibe to calm beats while browsing parties, which increases
// dwell time and booking conversion.

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: string; // "Chill" | "Focus" | "Party" | "Deep house" | "Ambient"
  emoji: string;
  color: string; // hex for the track accent
  audioUrl: string; // direct .mp3 URL
  duration: string; // "3:42" display label (approximate)
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "lofi-chill",
    title: "Midnight Lo-fi",
    artist: "VibeMatch Radio",
    mood: "Chill",
    emoji: "🌙",
    color: "#a78bfa",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    duration: "5:22",
  },
  {
    id: "deep-house",
    title: "Deep House Pulse",
    artist: "VibeMatch Radio",
    mood: "Party",
    emoji: "🎛️",
    color: "#f97316",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "6:10",
  },
  {
    id: "ambient-focus",
    title: "Ambient Focus",
    artist: "VibeMatch Radio",
    mood: "Focus",
    emoji: "✨",
    color: "#2dd4bf",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    duration: "5:15",
  },
  {
    id: "chill-hop",
    title: "Chill Hop Nights",
    artist: "VibeMatch Radio",
    mood: "Chill",
    emoji: "🎧",
    color: "#fbbf24",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: "5:35",
  },
  {
    id: "party-vibe",
    title: "Party Starter",
    artist: "VibeMatch Radio",
    mood: "Party",
    emoji: "🎉",
    color: "#ec4899",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration: "5:01",
  },
];

export function getTrack(id: string | null | undefined): MusicTrack | null {
  if (!id) return MUSIC_TRACKS[0];
  return MUSIC_TRACKS.find((t) => t.id === id) ?? MUSIC_TRACKS[0];
}

// Pretty-print seconds as m:ss
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
