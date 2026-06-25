"use client";

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

export function UserAvatar({
  name,
  src,
  size = 40,
  ring,
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink/30 to-violet/30 flex items-center justify-center",
        ring && "ring-2 ring-pink/60 ring-offset-2 ring-offset-background",
        className,
      )}
      style={{ width: size, height: size }}
    >
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
  );
}
