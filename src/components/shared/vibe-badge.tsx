"use client";

import { cn } from "@/lib/utils";
import { VIBE_EMOJI } from "@/lib/types";

interface VibeBadgeProps {
  vibe: string;
  size?: "sm" | "md";
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Bumble-style vibe chip — single accent (yellow). Every vibe renders as the
 * same yellow chip; only the emoji differentiates them. No per-vibe color map.
 */
export function VibeBadge({
  vibe,
  size = "sm",
  active,
  onClick,
  className,
}: VibeBadgeProps) {
  const emoji = VIBE_EMOJI[vibe] || "✨";
  const sizing =
    size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-amber-400/15 text-amber-300 border-amber-400/45 font-semibold transition",
        sizing,
        onClick &&
          "hover:bg-amber-400/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer",
        active && "ring-2 ring-amber-400 ring-offset-1 ring-offset-background",
        className,
      )}
    >
      <span aria-hidden className="text-[1.05em] leading-none">
        {emoji}
      </span>
      {vibe}
    </Tag>
  );
}
