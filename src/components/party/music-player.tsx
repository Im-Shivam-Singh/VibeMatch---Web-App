"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Music,
  Disc3,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Headphones,
  ChevronUp,
  ChevronDown,
  SkipForward,
  SkipBack,
  Music2,
  Plus,
  Trash2,
  Save,
  ListMusic,
  Link,
} from "lucide-react";
import { useMusicStore, type PlaylistEntry } from "@/lib/music/store";
import { MUSIC_TRACKS, getTrack, formatTime } from "@/lib/music/tracks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// MusicPlayerButton — circular icon button in the home-screen header.
// First tap shows the intro popup; subsequent taps toggle play.
// ─────────────────────────────────────────────────────────────────────
export function MusicPlayerButton() {
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const hasSeenIntro = useMusicStore((s) => s.hasSeenIntro);
  const play = useMusicStore((s) => s.play);
  const toggle = useMusicStore((s) => s.toggle);
  const dismissIntro = useMusicStore((s) => s.dismissIntro);
  const [introOpen, setIntroOpen] = useState(false);

  const onTap = () => {
    if (!hasSeenIntro) {
      setIntroOpen(true);
      return;
    }
    toggle();
  };

  const startPlaying = () => {
    play();
    dismissIntro();
    setIntroOpen(false);
  };

  return (
    <>
      <button
        onClick={onTap}
        aria-label={isPlaying ? "Pause music" : "Play music"}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-95",
          isPlaying
            ? "border-purple-500/50 bg-purple-500/20 text-purple-300 glow-violet"
            : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
        )}
      >
        {isPlaying ? (
          <>
            <Disc3 className="h-5 w-5 animate-spin [animation-duration:3s]" />
            {/* Pulse ring while playing */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-purple-500/40 animate-ping [animation-duration:2.5s]"
            />
          </>
        ) : (
          <Music className="h-5 w-5" />
        )}
      </button>

      {/* Intro popup — shown the first time the user taps the music icon */}
      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl border-purple-500/30 glass-strong">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 ring-2 ring-purple-500/40 relative overflow-hidden">
              <Headphones className="h-8 w-8 text-purple-300 relative z-10" />
              {/* animated equalizer bars behind the icon */}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-purple-400/70 rounded-full"
                    style={{
                      height: "100%",
                      animation: `eq 0.9s ${i * 0.12}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </span>
            </div>
            <DialogTitle className="font-display text-xl font-bold text-foreground">
              Play music and explore our app
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Use earphones 🎧
            </DialogDescription>
          </DialogHeader>
          <div className="px-2 pb-2 text-center">
            <p className="text-sm leading-relaxed text-foreground/80">
              Ambient beats to set the vibe. Browse parties, chat with hosts,
              and book your night — all while the music plays in the
              background.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {MUSIC_TRACKS.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-white/10"
                >
                  <span>{t.emoji}</span> {t.mood}
                </span>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={startPlaying}
              className="w-full rounded-full bg-purple-500 text-white hover:bg-purple-500/90"
            >
              <Play className="h-4 w-4 fill-current" /> Play music
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                dismissIntro();
                setIntroOpen(false);
              }}
              className="w-full rounded-full text-muted-foreground"
            >
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes eq {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MusicPlayerBar — the mini player above the bottom nav. Features:
//  • Real progress bar with seek-on-click
//  • Time display (current / total)
//  • Spinning disc + animated mini-waveform
//  • Volume slider + mute toggle
//  • Skip prev / next
//  • Expandable track list with mood accents
//  • My Playlist tab with save + add custom tracks
// ─────────────────────────────────────────────────────────────────────
export function MusicPlayerBar() {
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const volume = useMusicStore((s) => s.volume);
  const barExpanded = useMusicStore((s) => s.barExpanded);
  const userPlaylist = useMusicStore((s) => s.userPlaylist);
  const autoPlayOnLoad = useMusicStore((s) => s.autoPlayOnLoad);
  const toggle = useMusicStore((s) => s.toggle);
  const pause = useMusicStore((s) => s.pause);
  const play = useMusicStore((s) => s.play);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setTrack = useMusicStore((s) => s.setTrack);
  const setBarExpanded = useMusicStore((s) => s.setBarExpanded);
  const addToPlaylist = useMusicStore((s) => s.addToPlaylist);
  const removeFromPlaylist = useMusicStore((s) => s.removeFromPlaylist);
  const clearPlaylist = useMusicStore((s) => s.clearPlaylist);
  const savePlaylist = useMusicStore((s) => s.savePlaylist);
  const loadSavedPlaylist = useMusicStore((s) => s.loadSavedPlaylist);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expanded, setExpanded] = useState(barExpanded);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const prevMuted = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<"tracks" | "playlist">("tracks");
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const autoPlayedRef = useRef(false);

  // sync expanded state with store so it persists across mounts
  useEffect(() => {
    setBarExpanded(expanded);
  }, [expanded, setBarExpanded]);

  // Load saved playlist on mount and auto-play if available
  useEffect(() => {
    loadSavedPlaylist();
  }, [loadSavedPlaylist]);

  // Auto-play saved playlist on first load
  useEffect(() => {
    if (autoPlayedRef.current) return;
    if (autoPlayOnLoad && userPlaylist.length > 0 && !isPlaying) {
      autoPlayedRef.current = true;
      // Play the first track in the user's playlist
      const first = userPlaylist[0];
      if (first) {
        setTrack(first.id);
      }
    }
  }, [autoPlayOnLoad, userPlaylist, isPlaying, setTrack]);

  // Resolve the current track — check built-in tracks first, then user playlist
  const track = (() => {
    const builtIn = getTrack(currentTrackId);
    if (builtIn && builtIn.id === currentTrackId) return builtIn;
    // Check user playlist for custom tracks
    const custom = userPlaylist.find((t) => t.id === currentTrackId);
    if (custom) return custom;
    return builtIn; // fallback
  })();

  // Wire audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setLoading(false);
    };
    const onProgress = () => {
      try {
        if (audio.buffered.length > 0) {
          setBuffered(audio.buffered.end(audio.buffered.length - 1));
        }
      } catch {
        /* noop */
      }
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onCanPlay = () => setLoading(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [track]);

  // Main playback control effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    // Determine if this track has a playable audio URL
    const rawUrl = (track as any).audioUrl || (track as any).url || "";
    const isPlayableAudio =
      rawUrl.endsWith(".mp3") ||
      rawUrl.endsWith(".wav") ||
      rawUrl.endsWith(".ogg") ||
      rawUrl.endsWith(".m4a") ||
      rawUrl.includes("soundhelix.com") ||
      rawUrl.includes("/api/upload");

    let srcChanged = false;
    if (isPlayableAudio && rawUrl && audio.src !== rawUrl) {
      audio.src = rawUrl;
      audio.load();
      srcChanged = true;
      queueMicrotask(() => {
        setCurrentTime(0);
        setDuration(0);
        setBuffered(0);
        setLoading(true);
      });
    } else if (!isPlayableAudio) {
      // External link — pause audio, don't try to load
      audio.pause();
      audio.removeAttribute("src");
      queueMicrotask(() => {
        setCurrentTime(0);
        setDuration(0);
        setBuffered(0);
        setLoading(false);
        setAudioError(false);
      });
      srcChanged = true;
    }

    audio.volume = volume;

    if (isPlaying && isPlayableAudio) {
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* will retry on canplay event */
        });
      }
    } else {
      audio.pause();
    }

    if (srcChanged) {
      queueMicrotask(() => setAudioError(false));
    }
  }, [isPlaying, track, volume]);

  // Update volume without reloading the track
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const seekTo = useCallback(
    (frac: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(duration) || duration === 0) return;
      const t = Math.max(0, Math.min(duration, frac * duration));
      audio.currentTime = t;
      setCurrentTime(t);
    },
    [duration],
  );

  // All available tracks = built-in + user playlist
  const allTracks = (() => {
    const builtIn: { id: string; title: string; emoji: string; color: string; mood: string; duration: string; audioUrl?: string; url?: string; isCustom?: boolean }[] =
      MUSIC_TRACKS.map((t) => ({ ...t }));
    const custom: { id: string; title: string; emoji: string; color: string; mood: string; duration: string; audioUrl?: string; url?: string; isCustom?: boolean }[] =
      userPlaylist
        .filter((t) => t.isCustom)
        .map((t) => ({ ...t, url: t.url }));
    return [...builtIn, ...custom];
  })();

  const skipTo = useCallback(
    (dir: 1 | -1) => {
      const idx = allTracks.findIndex((t) => t.id === currentTrackId);
      const nextIdx =
        (idx + dir + allTracks.length) % allTracks.length;
      setTrack(allTracks[nextIdx].id);
    },
    [currentTrackId, setTrack, allTracks],
  );

  // Auto-advance when a track ends
  const onEnded = useCallback(() => {
    skipTo(1);
  }, [skipTo]);

  // Volume slider: mute toggle on click of the volume icon
  const onVolumeIconClick = () => {
    if (volume > 0) {
      prevMuted.current = volume;
      setVolume(0);
    } else {
      setVolume(prevMuted.current || 0.55);
    }
  };

  // Add a built-in track to the user playlist
  const addBuiltinToPlaylist = (t: (typeof MUSIC_TRACKS)[number]) => {
    addToPlaylist({
      id: t.id,
      title: t.title,
      url: t.audioUrl,
      emoji: t.emoji,
      color: t.color,
      mood: t.mood,
      duration: t.duration,
      isCustom: false,
    });
  };

  // Add a custom track (Spotify/YouTube link)
  const addCustomTrack = () => {
    const url = customUrl.trim();
    const title = customTitle.trim() || "Custom Track";
    if (!url) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isSpotify = url.includes("spotify.com");
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    addToPlaylist({
      id,
      title,
      url,
      emoji: isSpotify ? "🟢" : isYouTube ? "🔴" : "🎵",
      color: isSpotify ? "#1DB954" : isYouTube ? "#FF0000" : "#a78bfa",
      mood: isSpotify ? "Spotify" : isYouTube ? "YouTube" : "Custom",
      duration: "—",
      isCustom: true,
    });
    setCustomUrl("");
    setCustomTitle("");
    setShowAddForm(false);
  };

  // Handle save playlist button
  const handleSavePlaylist = () => {
    savePlaylist();
    // Quick visual feedback via a brief toast-like approach
  };

  if (!track) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const bufferedFrac = duration > 0 ? buffered / duration : 0;

  // Determine the display audio URL for custom tracks
  const trackAudioUrl = (track as any).audioUrl || (track as any).url || "";
  const isCustomTrack = !!(track as any).isCustom;
  const isExternalLink =
    isCustomTrack &&
    !trackAudioUrl.endsWith(".mp3") &&
    !trackAudioUrl.endsWith(".wav") &&
    !trackAudioUrl.endsWith(".ogg") &&
    !trackAudioUrl.endsWith(".m4a") &&
    !trackAudioUrl.includes("soundhelix.com") &&
    !trackAudioUrl.includes("/api/upload");

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={onEnded}
        onError={() => {
          setAudioError(true);
          setLoading(false);
        }}
        onLoadedMetadata={() => setLoading(false)}
        onCanPlay={() => {
          setLoading(false);
          if (useMusicStore.getState().isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => {
              /* will retry on next user gesture */
            });
          }
        }}
        preload="metadata"
      />

      {(isPlaying || expanded) && (
        <div className="fixed inset-x-0 bottom-[76px] z-40 mx-auto px-3 animate-screen-in" style={{ maxWidth: "min(480px, calc(100vw - 24px))" }}>
          <div
            className="overflow-hidden rounded-2xl border glass-strong shadow-2xl transition-all"
            style={{
              borderColor: `${track.color}55`,
              boxShadow: `0 -4px 30px -8px ${track.color}40, 0 10px 30px -10px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Progress bar across the very top edge */}
            {!isExternalLink && (
              <div className="relative h-1 w-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-white/15"
                  style={{ width: `${bufferedFrac * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-r-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: `linear-gradient(90deg, ${track.color}, #fff)`,
                  }}
                />
                {/* Seekable click target */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={progress}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  aria-label="Seek"
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                />
              </div>
            )}

            {/* Main row */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              {/* Spinning disc with progress ring */}
              <button
                onClick={toggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-95"
                style={{ background: `${track.color}25` }}
              >
                {/* Progress ring around the disc */}
                {!isExternalLink && (
                  <svg
                    className="absolute inset-0 h-full w-full -rotate-90"
                    viewBox="0 0 44 44"
                    aria-hidden
                  >
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="20"
                      fill="none"
                      stroke={track.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - progress)}
                      style={{ transition: "stroke-dashoffset 0.25s linear" }}
                    />
                  </svg>
                )}
                <span
                  className={cn(
                    "relative z-10",
                    isPlaying && "animate-spin [animation-duration:3s]",
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <span>{track.emoji}</span>
                  )}
                </span>
              </button>

              {/* Track info + time row */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {track.title}
                  </p>
                  {loading && (
                    <span className="inline-block h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-white/40 border-t-white" />
                  )}
                  {audioError && !loading && (
                    <span className="shrink-0 text-[10px] text-coral">
                      · unavailable
                    </span>
                  )}
                  {isExternalLink && isCustomTrack && (
                    <a
                      href={(track as any).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] text-purple-400 hover:text-purple-300 underline"
                    >
                      open link
                    </a>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {/* mini equalizer */}
                  {isPlaying && !audioError && !isExternalLink && (
                    <span className="flex items-end gap-[1.5px] h-2.5 mr-0.5">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-[2px] rounded-full"
                          style={{
                            background: track.color,
                            height: "100%",
                            animation: `eq 0.8s ${i * 0.1}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                  <span className="truncate">{(track as any).mood}</span>
                  {!isExternalLink && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Skip back (only when expanded) */}
              {expanded && (
                <button
                  onClick={() => skipTo(-1)}
                  aria-label="Previous track"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <SkipBack className="h-3.5 w-3.5 fill-current" />
                </button>
              )}

              {/* Play/pause (also accessible via disc tap) */}
              {!expanded && (
                <button
                  onClick={toggle}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition active:scale-90"
                  style={{ background: track.color }}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </button>
              )}

              {/* Skip forward */}
              {expanded && (
                <button
                  onClick={() => skipTo(1)}
                  aria-label="Next track"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <SkipForward className="h-3.5 w-3.5 fill-current" />
                </button>
              )}

              {/* Expand / collapse */}
              <button
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? "Collapse player" : "Expand player"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>

              {/* Close (only when collapsed) */}
              {!expanded && (
                <button
                  onClick={() => {
                    pause();
                    setExpanded(false);
                  }}
                  aria-label="Close player"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Expanded panel: volume + track list + playlist */}
            {expanded && (
              <div className="border-t border-white/10 px-3 pb-3 pt-2 animate-screen-in">
                {/* Volume row */}
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={onVolumeIconClick}
                    aria-label={volume === 0 ? "Unmute" : "Mute"}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={localVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setLocalVolume(v);
                      setVolume(v);
                    }}
                    className="h-1 flex-1 cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${track.color} 0%, ${track.color} ${
                        localVolume * 100
                      }%, rgba(255,255,255,0.1) ${localVolume * 100}%)`,
                      borderRadius: "999px",
                      accentColor: track.color,
                    }}
                    aria-label="Volume"
                  />
                  <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(localVolume * 100)}%
                  </span>
                  <button
                    onClick={() => {
                      pause();
                      setExpanded(false);
                    }}
                    aria-label="Close player"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Tab switcher */}
                <div className="mb-2 flex gap-1">
                  <button
                    onClick={() => setActiveTab("tracks")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition",
                      activeTab === "tracks"
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Music2 className="h-3 w-3" /> Tracks
                  </button>
                  <button
                    onClick={() => setActiveTab("playlist")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition",
                      activeTab === "playlist"
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <ListMusic className="h-3 w-3" /> My Playlist
                    {userPlaylist.length > 0 && (
                      <span className="rounded-full bg-purple-500/25 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                        {userPlaylist.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Built-in tracks list */}
                {activeTab === "tracks" && (
                  <>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Music2 className="h-3 w-3" /> Switch vibe
                    </p>
                    <div className="max-h-44 space-y-0.5 overflow-y-auto fancy-scrollbar pr-1">
                      {MUSIC_TRACKS.map((t) => {
                        const active = t.id === currentTrackId;
                        const inPlaylist = userPlaylist.some(
                          (p) => p.id === t.id,
                        );
                        return (
                          <div
                            key={t.id}
                            className="flex items-center"
                          >
                            <button
                              onClick={() => setTrack(t.id)}
                              className={cn(
                                "flex flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
                                active
                                  ? "bg-white/8 ring-1"
                                  : "hover:bg-white/5",
                              )}
                              style={
                                active
                                  ? {
                                      boxShadow: `inset 0 0 0 1px ${t.color}55`,
                                    }
                                  : undefined
                              }
                            >
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                style={{ background: `${t.color}25` }}
                              >
                                {active && isPlaying ? (
                                  <Disc3
                                    className="h-4 w-4 animate-spin [animation-duration:3s]"
                                    style={{ color: t.color }}
                                  />
                                ) : (
                                  <span>{t.emoji}</span>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "truncate text-xs font-medium",
                                    active
                                      ? "text-foreground"
                                      : "text-foreground/90",
                                  )}
                                >
                                  {t.title}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {t.mood} · {t.duration}
                                </p>
                              </div>
                              {active ? (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: `${t.color}25`,
                                    color: t.color,
                                  }}
                                >
                                  Now
                                </span>
                              ) : (
                                <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                            {/* Add to playlist button */}
                            <button
                              onClick={() => addBuiltinToPlaylist(t)}
                              disabled={inPlaylist}
                              aria-label={
                                inPlaylist
                                  ? "Already in playlist"
                                  : "Add to playlist"
                              }
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ml-1",
                                inPlaylist
                                  ? "text-purple-400/40"
                                  : "text-muted-foreground hover:bg-white/10 hover:text-purple-300",
                              )}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* My Playlist tab */}
                {activeTab === "playlist" && (
                  <>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ListMusic className="h-3 w-3" /> Your saved tracks
                      </p>
                      <div className="flex items-center gap-1">
                        {userPlaylist.length > 0 && (
                          <>
                            <button
                              onClick={handleSavePlaylist}
                              aria-label="Save playlist"
                              className="flex h-6 items-center gap-1 rounded-full bg-purple-500/15 px-2 text-[9px] font-bold text-purple-300 transition hover:bg-purple-500/25"
                            >
                              <Save className="h-2.5 w-2.5" /> Save
                            </button>
                            <button
                              onClick={clearPlaylist}
                              aria-label="Clear playlist"
                              className="flex h-6 items-center gap-1 rounded-full bg-coral/10 px-2 text-[9px] font-bold text-coral/80 transition hover:bg-coral/20"
                            >
                              <Trash2 className="h-2.5 w-2.5" /> Clear
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {userPlaylist.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <ListMusic className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                          No tracks saved yet
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          Add tracks from the Tracks tab or paste a link below
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-44 space-y-0.5 overflow-y-auto fancy-scrollbar pr-1">
                        {userPlaylist.map((t) => {
                          const active = t.id === currentTrackId;
                          return (
                            <div
                              key={t.id}
                              className="flex items-center"
                            >
                              <button
                                onClick={() => setTrack(t.id)}
                                className={cn(
                                  "flex flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
                                  active
                                    ? "bg-white/8 ring-1"
                                    : "hover:bg-white/5",
                                )}
                                style={
                                  active
                                    ? {
                                        boxShadow: `inset 0 0 0 1px ${t.color}55`,
                                      }
                                    : undefined
                                }
                              >
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                  style={{ background: `${t.color}25` }}
                                >
                                  {active && isPlaying ? (
                                    <Disc3
                                      className="h-4 w-4 animate-spin [animation-duration:3s]"
                                      style={{ color: t.color }}
                                    />
                                  ) : (
                                    <span>{t.emoji}</span>
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "truncate text-xs font-medium",
                                      active
                                        ? "text-foreground"
                                        : "text-foreground/90",
                                    )}
                                  >
                                    {t.title}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {t.mood}
                                    {t.isCustom && " · External link"}
                                  </p>
                                </div>
                                {active ? (
                                  <span
                                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                    style={{
                                      background: `${t.color}25`,
                                      color: t.color,
                                    }}
                                  >
                                    Now
                                  </span>
                                ) : (
                                  <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
                                )}
                              </button>
                              <button
                                onClick={() => removeFromPlaylist(t.id)}
                                aria-label="Remove from playlist"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-coral/10 hover:text-coral ml-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add custom track form */}
                    <div className="mt-2 space-y-1.5">
                      {showAddForm ? (
                        <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
                          <Input
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="Track name (optional)"
                            className="h-8 rounded-lg border-white/10 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400"
                          />
                          <div className="flex gap-1.5">
                            <Input
                              value={customUrl}
                              onChange={(e) => setCustomUrl(e.target.value)}
                              placeholder="Paste Spotify / YouTube link"
                              className="h-8 flex-1 rounded-lg border-white/10 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addCustomTrack();
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={addCustomTrack}
                              disabled={!customUrl.trim()}
                              className="h-8 rounded-lg bg-purple-500 px-3 text-[10px] font-bold text-white hover:bg-purple-500/90"
                            >
                              Add
                            </Button>
                          </div>
                          <button
                            onClick={() => {
                              setShowAddForm(false);
                              setCustomUrl("");
                              setCustomTitle("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] text-muted-foreground transition hover:border-purple-400/40 hover:text-purple-300"
                        >
                          <Link className="h-3 w-3" /> Add Spotify / YouTube
                          link
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
