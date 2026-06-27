// Music player state — persisted so the user's play/pause + volume + "intro
// seen" state survives page refreshes. Live playback position is kept in
// component-level React state (not persisted) so we don't thrash localStorage.
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MusicState {
  isPlaying: boolean;
  currentTrackId: string;
  volume: number; // 0..1
  hasSeenIntro: boolean;
  // If true, the mini player is force-expanded (used by the bar's chevron).
  barExpanded: boolean;
  // actions
  play: (trackId?: string) => void;
  pause: () => void;
  toggle: () => void;
  setTrack: (trackId: string) => void;
  setVolume: (v: number) => void;
  dismissIntro: () => void;
  setBarExpanded: (v: boolean) => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      isPlaying: false,
      currentTrackId: "lofi-chill",
      volume: 0.55,
      hasSeenIntro: false,
      barExpanded: false,

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
    }),
    { name: "vibematch-music" },
  ),
);
