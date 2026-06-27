"use client";

import {
  MapPin,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Sparkles,
  Heart,
  Flame,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateLabel,
  formatFee,
  formatTime,
  parseVibes,
  pickGuestAvatars,
  partyLiveStatus,
  slotsLeft,
  type Party,
} from "@/lib/types";
import { VibeBadge } from "./vibe-badge";
import { GuestAvatars } from "./guest-avatars";
import { LiveCountdown } from "./live-countdown";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface PartyCardProps {
  party: Party;
  onOpen: (id: string) => void;
  className?: string;
}

export function PartyCard({ party, onOpen, className }: PartyCardProps) {
  const vibes = parseVibes(party.vibes).slice(0, 4);
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isLow = left > 0 && left <= 5;
  const isFull = left === 0;
  const status = partyLiveStatus(party.date, party.time);
  const isLive = status === "live";
  const isStartingSoon = status === "starting-soon";

  const saved = useAppStore((s) => s.savedPartyIds.includes(party.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const guests = pickGuestAvatars(party.id, Math.min(5, party.guestCount));

  // Cover src — prefer the first gallery item (in case the list payload ever
  // includes media), else fall back to the legacy coverUrl. The list API
  // currently returns `media: []` so this effectively just uses coverUrl.
  const coverSrc = party.media?.[0]?.url ?? party.coverUrl;
  // Show a "▶ Video" badge only when the full media array is present and
  // contains at least one video clip. The list payload omits media entirely,
  // so this gracefully no-ops on the feed view (badge only shows up after the
  // user opens detail, when applicable, or if media is later included).
  const hasVideo =
    Array.isArray(party.media) && party.media.some((m) => m.type === "video");

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(party.id);
    toast.success(saved ? "Removed from saved" : "Saved to your list", {
      duration: 1500,
    });
  };

  // "Featured" feel: parties that are live OR have a high guest fill ratio get
  // a simple solid yellow "Featured" pill. Pure visual flourish.
  const featured = isLive || party.guestCount / Math.max(1, party.maxGuests) >= 0.75;

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
        "group relative w-full cursor-pointer overflow-hidden rounded-3xl text-left transition-all duration-300 press-feedback",
        "glass vibe-gradient-border",
        "hover:-translate-y-1 hover:glow-gold",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
        isLive && "ring-1 ring-amber-400/40 glow-gold",
        className,
      )}
    >
      {/* Live now accent strip on top edge */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-amber-400 animate-pulse" />
      )}

      {/* Cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={party.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-amber-400/15" />
        )}

        {/* Video badge — purple pill at top-center when any media is a video.
            Only shown when the list payload includes the media array (which
            it currently doesn't, so this is a forward-looking affordance). */}
        {hasVideo && (
          <span className="absolute left-1/2 top-3 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-purple-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
            <Play className="h-3 w-3 fill-white" strokeWidth={2.5} />
            Video
          </span>
        )}

        {/* Top chips */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col gap-1.5">
            {featured && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
                <Flame className="h-3 w-3" strokeWidth={2.5} />
                Featured
              </span>
            )}
            <span
              className={cn(
                "w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold",
                isFull
                  ? "bg-white/10 text-muted-foreground border border-white/15"
                  : isLow
                    ? "bg-amber-400 text-black"
                    : "bg-amber-400/15 text-amber-300 border border-amber-400/40",
              )}
            >
              {isFull ? "Sold out" : isLow ? `Only ${left} left` : `${left} slots`}
            </span>
            {(isLive || isStartingSoon) && (
              <LiveCountdown date={party.date} time={party.time} />
            )}
          </div>
          <button
            onClick={onSave}
            aria-label={saved ? "Unsave" : "Save"}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-90",
              saved
                ? "bg-amber-400/20 border-amber-400/60"
                : "bg-black/55 border-white/15 hover:bg-black/75 hover:border-amber-400/40",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition",
                saved ? "fill-amber-400 text-amber-400" : "text-foreground/80",
              )}
            />
          </button>
        </div>

        {/* Bottom-left: fee badge on cover */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-black">
            <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.5} />
            {formatFee(party.fee)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2 transition">
          {party.title}
        </h3>

        {/* Vibes + guest stack on same row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {vibes.map((v) => (
              <VibeBadge key={v} vibe={v} />
            ))}
          </div>
        </div>

        {/* Metadata grid — all icons yellow */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <Meta icon={<MapPin className="h-3.5 w-3.5 text-amber-400" />}>
            <span className="truncate">
              {party.area}, {party.city}
            </span>
          </Meta>
          <Meta icon={<Calendar className="h-3.5 w-3.5 text-amber-400" />}>
            {formatDateLabel(party.date)}
          </Meta>
          <Meta icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}>
            {formatTime(party.time)}
          </Meta>
          <Meta icon={<Users className="h-3.5 w-3.5 text-amber-400" />}>
            {party.guestCount}/{party.maxGuests} going
          </Meta>
        </div>

        {/* Footer: host + going avatars */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="truncate">
              <span className="text-muted-foreground/70">by</span>{" "}
              <span className="font-medium text-foreground">{party.hostName}</span>
            </span>
          </span>
          {party.guestCount > 0 && (
            <GuestAvatars avatars={guests} total={party.guestCount} size={22} max={3} />
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}
