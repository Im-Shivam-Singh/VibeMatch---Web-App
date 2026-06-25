"use client";

import {
  MapPin,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Sparkles,
  Heart,
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

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(party.id);
    toast.success(saved ? "Removed from saved" : "Saved to your list", {
      duration: 1500,
    });
  };

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
        "border border-border bg-card/80 backdrop-blur-sm",
        "hover:border-pink/40 hover:shadow-[0_12px_44px_-14px_rgba(236,72,153,0.45)] hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/60",
        isLive && "border-rose-500/40 shadow-[0_0_30px_-8px_rgba(244,63,94,0.45)]",
        className,
      )}
    >
      {/* Live now accent strip on top edge */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 vibe-gradient-bg animate-pulse" />
      )}

      {/* Cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {party.coverUrl ? (
          <img
            src={party.coverUrl}
            alt={party.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet/40 via-pink/30 to-cyan/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

        {/* Top chips */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md",
                isFull
                  ? "bg-rose-500/25 text-rose-100 border border-rose-400/40"
                  : isLow
                    ? "bg-amber-500/25 text-amber-100 border border-amber-400/40"
                    : "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30",
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
              "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition active:scale-90",
              saved
                ? "bg-pink/30 border-pink/50"
                : "bg-black/40 border-white/10 hover:bg-black/60",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition",
                saved ? "fill-pink text-pink" : "text-white",
              )}
            />
          </button>
        </div>

        {/* Bottom-left: fee badge on cover */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-full bg-black/55 px-3 py-1 text-sm font-bold text-white backdrop-blur-md border border-white/10">
            {formatFee(party.fee)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
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

        {/* Metadata grid — consistent 2-col */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <Meta icon={<MapPin className="h-3.5 w-3.5 text-pink/80" />}>
            <span className="truncate">
              {party.area}, {party.city}
            </span>
          </Meta>
          <Meta icon={<Calendar className="h-3.5 w-3.5 text-violet/80" />}>
            {formatDateLabel(party.date)}
          </Meta>
          <Meta icon={<Clock className="h-3.5 w-3.5 text-cyan/80" />}>
            {formatTime(party.time)}
          </Meta>
          <Meta icon={<Users className="h-3.5 w-3.5 text-pink/80" />}>
            {party.guestCount}/{party.maxGuests} going
          </Meta>
        </div>

        {/* Footer: host + going avatars */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet" />
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
