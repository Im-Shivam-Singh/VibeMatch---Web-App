"use client";

import {
  Compass,
  MessageCircle,
  Plus,
  User,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { Screen } from "@/lib/types";

interface NavItem {
  screen: Screen;
  label: string;
  icon: LucideIcon;
  // Which screens this nav item should appear "active" for.
  // (The user is somewhere within this top-level section.)
  activeFor: Screen[];
}

const NAV_ITEMS: NavItem[] = [
  {
    screen: "home",
    label: "Explore",
    icon: Compass,
    activeFor: ["home", "detail", "filter", "map", "saved"],
  },
  {
    screen: "inbox",
    label: "Inbox",
    icon: MessageCircle,
    activeFor: ["inbox", "chat"],
  },
  {
    screen: "tickets",
    label: "Tickets",
    icon: Ticket,
    activeFor: [
      "tickets",
      "payment",
      "confirmation",
      "countdown",
    ],
  },
  {
    screen: "profile",
    label: "Profile",
    icon: User,
    activeFor: [
      "profile",
      "edit-profile",
      "my-parties",
      "host-dashboard",
      "admin",
      "requests",
    ],
  },
];

export function BottomNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  // Hide on auth flows
  if (screen === "login" || screen === "onboarding") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] items-end justify-around px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-2"
      aria-label="Primary"
    >
      {/* Glass shell with purple top edge + glow */}
      <div className="pointer-events-none absolute inset-x-2 bottom-1 top-0 -z-10 rounded-[28px] glass-strong shadow-[0_-10px_50px_-12px_rgba(168,85,247,0.25),0_-2px_20px_-8px_rgba(0,0,0,0.75)]">
        {/* Top accent line — gradient purple */}
        <div className="absolute inset-x-3 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-purple-500/80 to-transparent" />
        {/* Subtle inner top reflection */}
        <div className="absolute inset-x-6 top-[1px] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Explore (position 1) */}
      <NavButton
        item={NAV_ITEMS[0]}
        active={NAV_ITEMS[0].activeFor.includes(screen)}
        onClick={() => setScreen("home")}
      />

      {/* Inbox (position 2) — with coral unread dot */}
      <NavButton
        item={NAV_ITEMS[1]}
        active={NAV_ITEMS[1].activeFor.includes(screen)}
        onClick={() => setScreen("inbox")}
        showUnreadDot
      />

      {/* Floating Action Button — solid purple disc (position 3, center) */}
      <CreateButton onClick={openCreate} />

      {/* Tickets (position 4) */}
      <NavButton
        item={NAV_ITEMS[2]}
        active={NAV_ITEMS[2].activeFor.includes(screen)}
        onClick={() => setScreen("tickets")}
      />

      {/* Profile (position 5) */}
      <NavButton
        item={NAV_ITEMS[3]}
        active={NAV_ITEMS[3].activeFor.includes(screen)}
        onClick={() => setScreen("profile")}
      />
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
  showUnreadDot,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  showUnreadDot?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-95",
        active
          ? "text-purple-300"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Active pill background — fades in behind the icon */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300",
          active
            ? "bg-purple-500/15 opacity-100 scale-100"
            : "bg-transparent opacity-0 scale-75 group-hover:bg-white/5 group-hover:opacity-100",
        )}
      />
      {/* Active top dot — small accent above icon */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0 h-1 w-1 rounded-full bg-purple-400 transition-all duration-300",
          active ? "opacity-100 scale-100" : "opacity-0 scale-0",
        )}
        style={{
          boxShadow: active ? "0 0 8px rgba(192,132,252,0.9)" : undefined,
        }}
      />
      <span className="relative flex h-7 w-7 items-center justify-center">
        <Icon
          className={cn(
            "h-5 w-5 transition-all duration-200",
            active && "scale-110 drop-shadow-[0_0_6px_rgba(192,132,252,0.6)]",
          )}
          strokeWidth={active ? 2.6 : 2}
        />
        {showUnreadDot && (
          <span
            aria-hidden
            className="absolute -right-0 -top-0.5 flex h-2.5 w-2.5 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full bg-coral" />
            <span className="absolute inset-0 animate-ping rounded-full bg-coral/60 [animation-duration:2.5s]" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative transition-all duration-200",
          active ? "font-semibold" : "font-normal",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Launch a vibe"
      className="group relative -mt-6 flex shrink-0 flex-col items-center"
    >
      {/* Soft purple glow halo behind the FAB */}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/30 blur-xl transition-opacity duration-300 group-hover:bg-purple-500/40"
      />
      {/* The disc */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 text-white ring-4 ring-background transition-transform duration-300 active:scale-90 group-hover:scale-105 shadow-[0_4px_20px_-2px_rgba(168,85,247,0.65)]">
        {/* Inner highlight */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent"
        />
        <Plus
          className="relative h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-90"
          strokeWidth={2.75}
        />
      </span>
      {/* Tiny label under FAB */}
      <span className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-purple-300/90 transition-colors group-hover:text-purple-200">
        Host
      </span>
    </button>
  );
}
