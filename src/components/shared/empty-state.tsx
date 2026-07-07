"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        /* Glass-morphism base */
        "border-white/[0.06] bg-card/60 backdrop-blur-xl",
        "shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)]",
        /* Override default shadcn Card spacing — we want centered content */
        "gap-0 py-0",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        {/* Icon container — subtle glass panel */}
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl",
            "border border-purple-500/25 bg-purple-500/[0.08]",
            "shadow-[0_0_24px_-6px_rgba(83,74,183,0.25)]",
            "transition-colors duration-300",
          )}
        >
          <Icon className="h-9 w-9 text-purple-400" strokeWidth={1.75} />
        </div>

        {/* Title */}
        <h3 className="font-display text-xl font-semibold text-foreground">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {/* Optional action */}
        {action}
      </CardContent>
    </Card>
  );
}
