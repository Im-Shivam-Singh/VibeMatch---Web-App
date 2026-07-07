"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface GuestAvatarsProps {
  avatars: string[];
  total: number;
  size?: number;
  max?: number;
  className?: string;
  /** When true, hides real images and shows generic silhouette placeholders */
  masked?: boolean;
}

// Colors for masked avatar placeholders
const MASKED_COLORS = [
  "bg-purple-500/40 text-purple-200",
  "bg-teal-500/35 text-teal-200",
  "bg-amber-500/35 text-amber-200",
  "bg-rose-500/35 text-rose-200",
  "bg-cyan-500/35 text-cyan-200",
];

/**
 * Overlapping avatar stack showing who's going. Renders up to `max` avatars
 * then a "+N" pill if total exceeds the shown count. All rings are purple
 * to match the VibeMatch brand palette.
 *
 * When `masked` is true, hides real names/images and shows generic
 * silhouette placeholders instead.
 */
export function GuestAvatars({
  avatars,
  total,
  size = 24,
  max = 4,
  className,
  masked = false,
}: GuestAvatarsProps) {
  const shown = avatars.slice(0, max);
  const extra = Math.max(0, total - shown.length);
  const overlap = Math.round(size * 0.42);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center" style={{ paddingRight: extra > 0 ? overlap : 0 }}>
        {shown.map((src, i) =>
          masked ? (
            <span
              key={i}
              className={cn(
                "relative flex items-center justify-center rounded-full ring-2 ring-purple-500/40 ring-offset-1 ring-offset-background",
                MASKED_COLORS[i % MASKED_COLORS.length],
              )}
              style={{
                width: size,
                height: size,
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: shown.length - i,
              }}
            >
              <User className="h-[60%] w-[60%]" />
            </span>
          ) : (
            <span
              key={i}
              className="relative overflow-hidden rounded-full ring-2 ring-purple-500/60 ring-offset-1 ring-offset-background bg-card"
              style={{
                width: size,
                height: size,
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: shown.length - i,
              }}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </span>
          ),
        )}
      </div>
      {extra > 0 && (
        <span
          className="flex items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white ring-2 ring-card ring-offset-1 ring-offset-background"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
