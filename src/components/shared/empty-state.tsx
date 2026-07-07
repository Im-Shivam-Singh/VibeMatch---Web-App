"use client";

import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="vibe-float flex h-20 w-20 items-center justify-center rounded-3xl glass border-purple-500/40">
        <Icon className="h-9 w-9 text-purple-400" strokeWidth={2} />
      </div>
      <h3 className="font-display text-xl font-semibold text-purple-300">
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
