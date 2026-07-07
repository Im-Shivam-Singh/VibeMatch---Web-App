// Music player state — persisted so the user's play/pause + volume + "intro
// seen" state survives page refreshes. Live playback position is kept in
// component-level React state (not persisted) so we don't thrash localStorage.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string; // audioUrl or external link
  emoji: string;
  color: string;
  mood: string;
  duration: string;
  isCustom?: boolean; // true for user-added Spotify/YouTube links
}

interface MusicState {
  isPlaying: boolean;
  currentTrackId: string;
  volume: number; // 0..1
  hasSeenIntro: boolean;
  // If true, the mini player is force-expanded (used by the bar's chevron).
  barExpanded: boolean;
  // User's saved playlist — persisted across sessions
  userPlaylist: PlaylistEntry[];
  autoPlayOnLoad: boolean; // auto-play saved playlist on mount
  // actions
  play: (trackId?: string) => void;
  pause: () => void;
  toggle: () => void;
  setTrack: (trackId: string) => void;
  setVolume: (v: number) => void;
  dismissIntro: () => void;
  setBarExpanded: (v: boolean) => void;
  // Playlist actions
  addToPlaylist: (entry: PlaylistEntry) => void;
  removeFromPlaylist: (id: string) => void;
  clearPlaylist: () => void;
  savePlaylist: () => void;
  loadSavedPlaylist: () => void;
  setAutoPlayOnLoad: (v: boolean) => void;
}

const PLAYLIST_STORAGE_KEY = "vibematch-playlist";

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      currentTrackId: "lofi-chill",
      volume: 0.55,
      hasSeenIntro: false,
      barExpanded: false,
      userPlaylist: [],
      autoPlayOnLoad: true,

      play: (trackId) =>
        set((s) => ({
          isPlaying: true,
          currentTrackId: trackId ?? s.currentTrackId,
        })),
      pause: () => set({ isPlaying: false }),
      toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setTrack: (trackId) =>
        set({ currentTrackId: trackId, isPlaying: true }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      dismissIntro: () => set({ hasSeenIntro: true }),
      setBarExpanded: (v) => set({ barExpanded: v }),

      // Add a track to the user's playlist (no duplicates by id)
      addToPlaylist: (entry) =>
        set((s) => {
          if (s.userPlaylist.some((t) => t.id === entry.id)) return s;
          return { userPlaylist: [...s.userPlaylist, entry] };
        }),

      // Remove a track from the user's playlist by id
      removeFromPlaylist: (id) =>
        set((s) => ({
          userPlaylist: s.userPlaylist.filter((t) => t.id !== id),
        })),

      // Clear the entire playlist
      clearPlaylist: () => set({ userPlaylist: [] }),

      // Save the current playlist to localStorage (explicit save)
      savePlaylist: () => {
        const { userPlaylist } = get();
        try {
          localStorage.setItem(
            PLAYLIST_STORAGE_KEY,
            JSON.stringify(userPlaylist),
          );
        } catch {
          /* localStorage might be unavailable */
        }
      },

      // Load a previously saved playlist from localStorage
      loadSavedPlaylist: () => {
        try {
          const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
          if (raw) {
            const entries: PlaylistEntry[] = JSON.parse(raw);
            if (Array.isArray(entries) && entries.length > 0) {
              set({ userPlaylist: entries });
            }
          }
        } catch {
          /* ignore parse errors */
        }
      },

      setAutoPlayOnLoad: (v) => set({ autoPlayOnLoad: v }),
    }),
    {
      name: "vibematch-music",
      // Persist userPlaylist as part of the store so it survives refreshes
      partialize: (state) => ({
        isPlaying: state.isPlaying,
        currentTrackId: state.currentTrackId,
        volume: state.volume,
        hasSeenIntro: state.hasSeenIntro,
        barExpanded: state.barExpanded,
        userPlaylist: state.userPlaylist,
        autoPlayOnLoad: state.autoPlayOnLoad,
      }),
    },
  ),
);
