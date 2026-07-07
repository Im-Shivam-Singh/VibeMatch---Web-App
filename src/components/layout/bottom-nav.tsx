"use client";

import { useState } from "react";
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

// ── Main BottomNav ─────────────────────────────────────────────────────────
export function BottomNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  // Hide on auth flows
  if (screen === "login" || screen === "onboarding") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label="Primary"
    >
      {/* ── Frosted glass shell ──────────────────────────────────────── */}
      <div className="relative mx-3 mb-2 rounded-t-2xl border-t border-border bg-background/70 backdrop-blur-[24px] supports-[backdrop-filter]:bg-background/60">
        {/* Top accent line — purple gradient */}
        <div
          aria-hidden
          className="absolute inset-x-0 -top-px h-[2px] rounded-full bg-gradient-to-r from-transparent via-purple-500/70 to-transparent"
        />

        {/* ── Nav items row ─────────────────────────────────────────── */}
        <div className="flex items-end justify-around px-1 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
          {/* Explore */}
          <NavButton
            item={NAV_ITEMS[0]}
            active={NAV_ITEMS[0].activeFor.includes(screen)}
            onClick={() => setScreen("home")}
          />

          {/* Inbox — with unread dot */}
          <NavButton
            item={NAV_ITEMS[1]}
            active={NAV_ITEMS[1].activeFor.includes(screen)}
            onClick={() => setScreen("inbox")}
            showUnreadDot
          />

          {/* Host FAB — elevated center */}
          <CreateButton onClick={openCreate} />

          {/* Tickets — with badge count */}
          <NavButton
            item={NAV_ITEMS[2]}
            active={NAV_ITEMS[2].activeFor.includes(screen)}
            onClick={() => setScreen("tickets")}
            badgeCount={0}
          />

          {/* Profile */}
          <NavButton
            item={NAV_ITEMS[3]}
            active={NAV_ITEMS[3].activeFor.includes(screen)}
            onClick={() => setScreen("profile")}
          />
        </div>
      </div>
    </nav>
  );
}

// ── NavButton ──────────────────────────────────────────────────────────────
function NavButton({
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
      className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-all duration-200 active:scale-95"
    >
      {/* ── Active indicator dot with pulse ────────────────────────── */}
      {active && (
        <span
          aria-hidden
          className="absolute -top-0.5 h-1 w-1 rounded-full bg-purple-400"
          style={{ boxShadow: "0 0 8px rgba(192,132,252,0.9)" }}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-full bg-purple-400/60 [animation-duration:2s]" />
        </span>
      )}

      {/* ── Icon wrapper ────────────────────────────────────────────── */}
      <span className="relative flex h-7 w-7 items-center justify-center">
        {/* Active pill background */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -m-1.5 rounded-2xl bg-purple-500/15 transition-all duration-200",
            active ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
        />

        <Icon
          className={cn(
            "relative h-5 w-5 transition-all duration-200",
            active
              ? "text-purple-300 scale-110"
              : "text-muted-foreground",
          )}
          strokeWidth={active ? 2.4 : 1.8}
          style={
            active
              ? {
                  filter:
                    "drop-shadow(0 0 6px rgba(192,132,252,0.6))",
                }
              : undefined
          }
        />

        {/* ── Unread dot (coral, ping animation) ────────────────────── */}
        {showUnreadDot && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full bg-coral" />
            <span className="absolute inset-0 animate-ping rounded-full bg-coral/50 [animation-duration:2.5s]" />
          </span>
        )}

        {/* ── Badge count ────────────────────────────────────────────── */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>

      {/* ── Label ────────────────────────────────────────────────────── */}
      <span
        className={cn(
          "relative text-[10px] leading-tight transition-all duration-200",
          active
            ? "font-bold text-purple-300"
            : "font-medium text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

// ── CreateButton (Host FAB) ────────────────────────────────────────────────
function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Host a vibe"
      className="group relative -mt-6 flex shrink-0 flex-col items-center"
    >
      {/* ── Soft purple glow halo ──────────────────────────────────── */}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/25 blur-xl transition-all duration-300 group-hover:bg-purple-500/35 group-hover:h-20 group-hover:w-20"
      />

      {/* ── The gradient disc ──────────────────────────────────────── */}
      <span
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600",
          "text-white ring-4 ring-background",
          "transition-all duration-300 active:scale-90",
          "shadow-[0_4px_24px_-2px_rgba(168,85,247,0.65)]",
        )}
      >
        {/* Inner highlight */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent"
        />

        <span className="relative">
          <Plus className="h-6 w-6 text-white" strokeWidth={2.75} />
        </span>
      </span>

      {/* ── Host label ─────────────────────────────────────────────── */}
      <span className="mt-1 text-center text-[9px] font-semibold uppercase tracking-widest text-purple-300/80 transition-colors group-hover:text-purple-200">
        Host
      </span>
    </button>
  );
}
