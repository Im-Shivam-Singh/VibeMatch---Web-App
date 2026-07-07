"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserAvatar = React.memo(function UserAvatar({
  name,
  src,
  size = 40,
  ring,
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        ring && "rounded-full ring-2 ring-amber-400",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card">
        {src ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="font-display font-semibold text-white"
            style={{ fontSize: size * 0.36 }}
          >
            {initials(name)}
          </span>
        )}
      </div>

      {/* Online dot — shown when `ring` is on as a status accent */}
      {ring && (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 block rounded-full bg-amber-400 ring-2 ring-background"
          style={{
            width: Math.max(8, Math.round(size * 0.22)),
            height: Math.max(8, Math.round(size * 0.22)),
          }}
        />
      )}
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';
