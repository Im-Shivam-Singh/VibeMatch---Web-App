"use client";

import { cn } from "@/lib/utils";

interface GuestAvatarsProps {
  avatars: string[];
  total: number;
  size?: number;
  max?: number;
  className?: string;
}

/**
 * Overlapping avatar stack showing who's going. Renders up to `max` avatars
 * then a "+N" pill if total exceeds the shown count. All rings are purple
 * to match the VibeMatch brand palette.
 */
export function GuestAvatars({
  avatars,
  total,
  size = 24,
  max = 4,
  className,
}: GuestAvatarsProps) {
  const shown = avatars.slice(0, max);
  const extra = Math.max(0, total - shown.length);
  const overlap = Math.round(size * 0.42);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center" style={{ paddingRight: extra > 0 ? overlap : 0 }}>
        {shown.map((src, i) => (
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
        ))}
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
