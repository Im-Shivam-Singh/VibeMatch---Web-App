"use client";

import { Compass, MessageCircle, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { Screen } from "@/lib/types";

interface NavItem {
  screen: Screen;
  label: string;
  icon: typeof Compass;
}

const NAV_ITEMS: NavItem[] = [
  { screen: "home", label: "Explore", icon: Compass },
  { screen: "inbox", label: "Inbox", icon: MessageCircle },
  { screen: "profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  // hide bottom nav on login
  if (screen === "login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] items-end justify-around px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
      aria-label="Primary"
    >
      <div className="pointer-events-none absolute inset-x-3 bottom-2 top-0 -z-10 rounded-3xl border border-border/70 glass shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.6)]" />

      {/* Explore */}
      <NavButton
        item={NAV_ITEMS[0]}
        active={screen === "home" || screen === "detail"}
        onClick={() => setScreen("home")}
      />

      {/* Inbox with FAB gap */}
      <NavButton
        item={NAV_ITEMS[1]}
        active={screen === "inbox" || screen === "chat"}
        onClick={() => setScreen("inbox")}
      />

      {/* Floating Action Button */}
      <button
        onClick={openCreate}
        aria-label="Launch a vibe"
        className="relative -mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-full vibe-gradient-bg text-white shadow-[0_10px_30px_-6px_rgba(236,72,153,0.7)] ring-4 ring-background transition-transform active:scale-90 hover:scale-105"
      >
        <span className="absolute inset-0 rounded-full bg-pink/40 blur-md -z-10" />
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {/* Profile (right of FAB) */}
      <NavButton
        item={NAV_ITEMS[2]}
        active={
          screen === "profile" ||
          screen === "edit-profile" ||
          screen === "my-parties" ||
          screen === "requests"
        }
        onClick={() => setScreen("profile")}
      />

      {/* spacer to balance the 5-slot visual rhythm */}
      <div className="w-8" aria-hidden />
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
        active ? "text-pink" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all",
          active
            ? "bg-pink/15 shadow-[0_0_20px_-4px_rgba(236,72,153,0.6)]"
            : "group-hover:bg-white/5",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        {active && (
          <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-pink" />
        )}
      </span>
      {item.label}
    </button>
  );
}
