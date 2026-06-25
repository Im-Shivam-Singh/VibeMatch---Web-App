"use client";

import { cn } from "@/lib/utils";
import { VIBE_COLORS, VIBE_EMOJI } from "@/lib/types";

interface VibeBadgeProps {
  vibe: string;
  size?: "sm" | "md";
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function VibeBadge({
  vibe,
  size = "sm",
  active,
  onClick,
  className,
}: VibeBadgeProps) {
  const colorClass =
    VIBE_COLORS[vibe] ||
    "from-fuchsia-500/20 to-purple-500/20 text-fuchsia-200 border-fuchsia-500/30";
  const emoji = VIBE_EMOJI[vibe] || "✨";
  const sizing =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-gradient-to-br font-medium backdrop-blur-sm transition",
        colorClass,
        sizing,
        onClick && "hover:scale-105 active:scale-95 cursor-pointer",
        active && "ring-2 ring-pink/60 ring-offset-1 ring-offset-background",
        className,
      )}
    >
      <span aria-hidden>{emoji}</span>
      {vibe}
    </Tag>
  );
}
