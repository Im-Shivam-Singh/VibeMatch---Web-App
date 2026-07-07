"use client";

import { useEffect, useState } from "react";
import { Radio, Hourglass, CheckCircle2, CalendarClock } from "lucide-react";
import {
  countdownTo,
  partyLiveStatus,
  type PartyLiveStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  date: string;
  time: string;
  className?: string;
  size?: "sm" | "md";
  durationHours?: number;
}

const STATUS_STYLES: Record<
  PartyLiveStatus,
  {
    bg: string;
    text: string;
    icon: typeof Radio;
    label: (c: string) => string;
    extra?: string;
  }
> = {
  // LIVE NOW — bright coral + ring pulse
  live: {
    bg: "bg-coral/20 border-coral/60",
    text: "text-coral",
    icon: Radio,
    label: () => "Live now",
    extra: "vibe-live-ring",
  },
  // starting-soon — amber warmth
  "starting-soon": {
    bg: "bg-amber-500/10 border-amber-500/40",
    text: "text-amber-300",
    icon: Hourglass,
    label: (c: string) => `Starts ${c}`,
  },
  // today — amber warmth
  today: {
    bg: "bg-amber-500/10 border-amber-500/40",
    text: "text-amber-300",
    icon: CalendarClock,
    label: (c: string) => `Today · ${c}`,
  },
  // upcoming — amber warmth
  upcoming: {
    bg: "bg-amber-500/10 border-amber-500/40",
    text: "text-amber-300",
    icon: CalendarClock,
    label: (c: string) => `Starts ${c}`,
  },
  // past — muted grey
  past: {
    bg: "bg-secondary/40 border-border/40",
    text: "text-muted-foreground",
    icon: CheckCircle2,
    label: () => "Ended",
  },
};

/**
 * LiveCountdown — a self-updating badge that shows the current live status
 * of a party ("Live now", "Starts in 2h 15m", "Today · in 5h", "Ended").
 * Re-renders every 30s so the countdown stays fresh.
 */
export function LiveCountdown({
  date,
  time,
  className,
  size = "sm",
  durationHours = 4,
}: LiveBadgeProps) {
  // tick state to force re-render every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const status = partyLiveStatus(date, time, durationHours);
  const countdown = countdownTo(date, time, durationHours);
  const cfg = STATUS_STYLES[status];
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        cfg.bg,
        cfg.text,
        cfg.extra,
        className,
      )}
    >
      <Icon
        className={cn(
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          status === "live" && "animate-pulse",
        )}
      />
      {cfg.label(countdown)}
    </span>
  );
}
