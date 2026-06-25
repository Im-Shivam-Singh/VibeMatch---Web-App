"use client";

import { MapPin, Calendar, Clock, Users, IndianRupee, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateLabel,
  formatFee,
  formatTime,
  parseVibes,
  slotsLeft,
  type Party,
} from "@/lib/types";
import { VibeBadge } from "./vibe-badge";

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

  return (
    <button
      onClick={() => onOpen(party.id)}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl text-left transition-all duration-300",
        "border border-border bg-card/80 backdrop-blur-sm",
        "hover:border-pink/40 hover:shadow-[0_10px_40px_-12px_rgba(236,72,153,0.4)] hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/60",
        className,
      )}
    >
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
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Top chips */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
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
            {isFull
              ? "Sold out"
              : isLow
                ? `Only ${left} left`
                : `${left} slots`}
          </span>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
            {formatFee(party.fee)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative -mt-6 space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
            {party.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {vibes.map((v) => (
            <VibeBadge key={v} vibe={v} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-pink/80" />
            <span className="truncate">
              {party.area}, {party.city}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-violet/80" />
            {formatDateLabel(party.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan/80" />
            {formatTime(party.time)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-pink/80" />
            {party.guestCount}/{party.maxGuests} going
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            Hosted by{" "}
            <span className="font-medium text-foreground">{party.hostName}</span>
          </span>
          {party.fee > 0 && (
            <span className="inline-flex items-center text-[13px] font-semibold text-foreground">
              <IndianRupee className="h-3.5 w-3.5" />
              {party.fee}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
