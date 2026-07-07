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

// ── Nav item definition ────────────────────────────────────────────────────
interface NavItem {
  screen: Screen;
  label: string;
  icon: LucideIcon;
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
    activeFor: ["inbox", "chat", "group-chat"],
  },
  {
    screen: "tickets",
    label: "Tickets",
    icon: Ticket,
    activeFor: ["tickets", "payment", "confirmation", "countdown"],
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

// ── Bottom Navigation ──────────────────────────────────────────────────────
export function BottomNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  // Hide during auth flows
  if (screen === "login" || screen === "onboarding") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label="Primary navigation"
    >
      {/* Frosted glass container */}
      <div className="relative mx-2 mb-2 overflow-hidden rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl">
        {/* Top accent line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"
        />

        {/* Nav items row */}
        <div className="flex items-end justify-around px-1 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
          {/* Explore */}
          <NavItemButton
            item={NAV_ITEMS[0]}
            active={NAV_ITEMS[0].activeFor.includes(screen)}
            onClick={() => setScreen("home")}
          />

          {/* Inbox */}
          <NavItemButton
            item={NAV_ITEMS[1]}
            active={NAV_ITEMS[1].activeFor.includes(screen)}
            onClick={() => setScreen("inbox")}
            showUnreadDot
          />

          {/* Host FAB */}
          <HostFab onClick={openCreate} />

          {/* Tickets */}
          <NavItemButton
            item={NAV_ITEMS[2]}
            active={NAV_ITEMS[2].activeFor.includes(screen)}
            onClick={() => setScreen("tickets")}
          />

          {/* Profile */}
          <NavItemButton
            item={NAV_ITEMS[3]}
            active={NAV_ITEMS[3].activeFor.includes(screen)}
            onClick={() => setScreen("profile")}
          />
        </div>
      </div>
    </nav>
  );
}

// ── Nav Item Button ────────────────────────────────────────────────────────
function NavItemButton({
  item,
  active,
  onClick,
  showUnreadDot,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  showUnreadDot?: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-all active:scale-95"
    >
      {/* Active indicator dot */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 h-1 w-1 rounded-full bg-purple-400"
        />
      )}

      {/* Icon wrapper */}
      <span className="relative flex h-7 w-7 items-center justify-center">
        {/* Active background pill */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -m-1.5 rounded-2xl transition-all duration-200",
            active
              ? "scale-100 bg-purple-500/15 opacity-100"
              : "scale-75 opacity-0"
          )}
        />

        <Icon
          className={cn(
            "relative h-5 w-5 transition-colors duration-200",
            active ? "text-purple-400" : "text-muted-foreground"
          )}
          strokeWidth={active ? 2.4 : 1.8}
        />

        {/* Unread dot */}
        {showUnreadDot && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-coral"
          />
        )}

        {/* Badge count */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>

      {/* Label */}
      <span
        className={cn(
          "text-[10px] leading-tight transition-colors duration-200",
          active
            ? "font-semibold text-purple-400"
            : "font-medium text-muted-foreground"
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

// ── Host FAB ───────────────────────────────────────────────────────────────
function HostFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Host a vibe"
      className="group relative -mt-5 flex shrink-0 flex-col items-center"
    >
      {/* Gradient disc */}
      <span
        className={cn(
          "relative flex h-13 w-13 items-center justify-center rounded-full",
          "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600",
          "text-white ring-4 ring-background",
          "transition-transform duration-200 active:scale-90",
          "shadow-lg shadow-purple-500/40"
        )}
      >
        <Plus className="h-6 w-6 text-white" strokeWidth={2.75} />
      </span>

      {/* Host label */}
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-purple-400/80 transition-colors group-hover:text-purple-300">
        Host
      </span>
    </button>
  );
}
