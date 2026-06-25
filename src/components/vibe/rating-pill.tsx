"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingPillProps {
  rating: number;
  count?: number;
  className?: string;
}

export function RatingPill({ rating, count, className }: RatingPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200 border border-amber-400/20",
        className,
      )}
    >
      <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
      {rating.toFixed(1)}
      {count !== undefined && (
        <span className="text-amber-200/60">({count})</span>
      )}
    </span>
  );
}
