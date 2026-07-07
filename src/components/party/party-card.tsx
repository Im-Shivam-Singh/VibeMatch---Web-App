"use client";

import React, { useState, useCallback } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Heart,
  Flame,
  Play,
  Radio,
  Sparkles,
} from "lucide-react";
import { cn, formatLocation } from "@/lib/utils";
import {
  formatDateLabel,
  formatFee,
  formatTime,
  parseVibes,
  pickGuestAvatars,
  partyLiveStatus,
  slotsLeft,
  countdownTo,
  VIBE_EMOJI,
  VIBE_COLORS,
  currencyForCity,
  type Party,
} from "@/lib/types";
import { GuestAvatars } from "@/components/shared/guest-avatars";
import { LiveCountdown } from "@/components/party/live-countdown";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface PartyCardProps {
  party: Party;
  onOpen: (id: string) => void;
  className?: string;
  /** When true, renders a wider hero-style card for the "Hot Tonight" section */
  featured?: boolean;
  /** Animation delay index for staggered entrance */
  index?: number;
}

// Vibe-specific gradient backgrounds for the cover when no image is available
const VIBE_GRADIENTS: Record<string, string> = {
  "R&B": "from-purple-900/80 via-purple-800/60 to-indigo-950/80",
  Bollywood: "from-green-900/80 via-emerald-800/60 to-teal-950/80",
  Games: "from-teal-900/80 via-cyan-800/60 to-blue-950/80",
  "Lo-fi": "from-violet-900/80 via-purple-800/60 to-slate-950/80",
  Chill: "from-cyan-900/80 via-teal-800/60 to-emerald-950/80",
  EDM: "from-rose-900/80 via-pink-800/60 to-purple-950/80",
  Retro: "from-amber-900/80 via-orange-800/60 to-red-950/80",
};

export const PartyCard = React.memo(function PartyCard({ party, onOpen, className, featured = false, index = 0 }: PartyCardProps) {
  const vibes = parseVibes(party.vibes);
  const displayVibes = vibes.slice(0, 3);
  const extraVibes = vibes.length - 3;
  const firstVibe = vibes[0] ?? "Chill";
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isLow = left > 0 && left <= 3;
  const isFull = left === 0;
  const status = partyLiveStatus(party.date, party.time);
  const isLive = status === "live";
  const isStartingSoon = status === "starting-soon";
  const going = party.guestCount;

  const saved = useAppStore((s) => s.savedPartyIds.includes(party.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const guests = pickGuestAvatars(party.id, Math.min(5, party.guestCount));
  const coverSrc = party.media?.[0]?.url ?? party.coverUrl;
  const hasVideo =
    Array.isArray(party.media) && party.media.some((m) => m.type === "video");

  const [heartAnimating, setHeartAnimating] = useState(false);

  const onSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleSaved(party.id);
      if (!saved) setHeartAnimating(true);
      toast.success(saved ? "Removed from saved" : "Saved to your list", {
        duration: 1500,
      });
    },
    [saved, toggleSaved, party.id],
  );

  const sym = currencyForCity(party.city);
  const gradientClass = VIBE_GRADIENTS[firstVibe] ?? "from-purple-900/80 via-purple-800/60 to-indigo-950/80";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(party.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(party.id);
        }
      }}

      className={cn(
        "group relative w-full cursor-pointer overflow-hidden text-left",
        "rounded-2xl lg:rounded-3xl",
        "bg-card/80",
        "border border-white/[0.06]",
        "shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]",
        "hover:shadow-[0_20px_44px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(83,74,183,0.25),0_8px_28px_-8px_rgba(83,74,183,0.12)]",
        "hover:border-purple-500/30",
        "transition-shadow duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isLive && "ring-1 ring-coral/40",
        featured && "md:min-w-[340px]",
        className,
      )}
    >
      {/* ====== Cover Section ====== */}
      <div
        className={cn(
          "relative w-full overflow-hidden",
          featured ? "aspect-[16/9]" : "aspect-[16/10]",
        )}
      >
        {/* Background image or gradient */}
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={party.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br gradient-shift",
              gradientClass,
            )}
          />
        )}

        {/* Multi-layer gradient overlays for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

        {/* Floating vibe emoji — large, centered, subtle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-5xl opacity-20 blur-[0.5px] transition-all duration-500 group-hover:opacity-30 group-hover:scale-110">
            {VIBE_EMOJI[firstVibe] ?? "🎉"}
          </span>
        </div>

        {/* ====== Top badges ====== */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 lg:p-4">
          <div className="flex flex-col gap-1.5">
            {/* LIVE badge */}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-coral/25">
                <span className="relative flex h-2 w-2">
                  <span className="live-pulse-ring absolute inline-flex h-full w-full rounded-full bg-coral/60" />
                  <span className="live-pulse-dot relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                LIVE
              </span>
            )}

            {/* Starting soon badge */}
            {isStartingSoon && !isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20">
                <Flame className="h-3 w-3" strokeWidth={2.5} />
                Starting soon
              </span>
            )}

            {/* Video badge */}
            {hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-lg">
                <Play className="h-3 w-3 fill-white" strokeWidth={2.5} />
                Video
              </span>
            )}

            {/* Countdown badge for starting-soon */}
            {(isLive || isStartingSoon) && (
              <LiveCountdown date={party.date} time={party.time} />
            )}
          </div>

          {/* Save heart button */}
          <button
            onClick={onSave}
            aria-label={saved ? "Unsave party" : "Save party"}

            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
              "border backdrop-blur-md",
              saved
                ? "bg-coral/20 border-coral/60 shadow-lg shadow-coral/20"
                : "bg-black/40 border-white/15 hover:bg-black/60 hover:border-coral/40",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                saved ? "fill-coral text-coral" : "text-white/80",
                heartAnimating && "heart-fill-anim",
              )}
              onAnimationEnd={() => setHeartAnimating(false)}
            />
          </button>
        </div>

        {/* ====== Bottom badges on cover ====== */}
        <div className="absolute bottom-0 inset-x-0 flex items-end justify-between p-3 lg:p-4">
          {/* Fee badge — bottom left, prominent */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold shadow-lg backdrop-blur-sm",
              party.fee === 0
                ? "bg-teal-500/90 text-white shadow-teal-500/20"
                : "bg-amber-400/95 text-black shadow-amber-400/20",
            )}
          >
            {party.fee === 0 ? (
              "Free"
            ) : (
              <>
                <span className="text-xs">{sym}</span>
                {party.fee}
              </>
            )}
          </span>

          {/* Spots remaining badge — bottom right */}
          {isFull ? (
            <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white/60 backdrop-blur-sm">
              Sold out
            </span>
          ) : isLow ? (
            <span className="urgency-flash inline-flex items-center gap-1 rounded-lg bg-coral/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg shadow-coral/20 backdrop-blur-sm">
              <Users className="h-3 w-3" />
              Only {left} left!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              <Users className="h-3 w-3" />
              {going} going
            </span>
          )}
        </div>
      </div>

      {/* ====== Content Section ====== */}
      <div className="space-y-3 p-3.5 lg:p-4">
        {/* Title */}
        <h3 className="font-display text-[15px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-purple-200 transition-colors duration-200">
          {party.title}
        </h3>

        {/* Host info row */}
        <div className="flex items-center gap-2">
          {party.hostAvatarUrl ? (
            <img
              src={party.hostAvatarUrl}
              alt={party.hostName}
              className="h-5 w-5 rounded-full ring-1 ring-purple-500/30 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 ring-1 ring-purple-500/30">
              <Sparkles className="h-2.5 w-2.5 text-purple-400" />
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            Hosted by{" "}
            <span className="font-medium text-foreground/90">{party.hostName}</span>
          </span>
          {party.hostVerified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-500/15 px-1 py-0.5 text-[8px] font-bold text-teal-300">
              ✓
            </span>
          )}
        </div>

        {/* Metadata — location, date, time */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-400" />
            <span className="truncate">{formatLocation(party.area, party.city)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>{formatDateLabel(party.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-teal-400" />
              <span>{formatTime(party.time)}</span>
            </div>
          </div>
        </div>

        {/* Vibe tags + guest avatars */}
        <div className="flex items-center justify-between gap-2 pt-0.5 overflow-hidden">
          {/* Vibe pills */}
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {displayVibes.map((v) => (
              <span
                key={v}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  VIBE_COLORS[v] ?? "bg-white/5 text-muted-foreground border-border",
                )}
              >
                <span className="text-[0.85em] leading-none">{VIBE_EMOJI[v] ?? "✨"}</span>
                {v}
              </span>
            ))}
            {extraVibes > 0 && (
              <span className="inline-flex items-center rounded-full border border-border bg-card/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{extraVibes}
              </span>
            )}
          </div>

          {/* Guest avatar stack */}
          {party.guestCount > 0 && (
            <GuestAvatars avatars={guests} total={party.guestCount} size={22} max={3} />
          )}
        </div>
      </div>
    </div>
  );
});

PartyCard.displayName = 'PartyCard';
