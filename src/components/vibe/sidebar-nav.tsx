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

export function SidebarNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  // Hide on auth flows
  if (screen === "login" || screen === "onboarding") return null;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-white/10 bg-[#09080f] lg:flex"
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
          <span className="text-xl">🎉</span>
        </div>
        <div className="font-display text-xl font-extrabold tracking-tight">
          Vibe<span className="text-purple-400">Match</span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="mt-6 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.activeFor.includes(screen);
          return (
            <SidebarButton
              key={item.screen}
              item={item}
              active={active}
              onClick={() => setScreen(item.screen)}
            />
          );
        })}
      </nav>

      {/* Host CTA */}
      <div className="mt-6 px-4">
        <button
          onClick={openCreate}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 py-3 text-sm font-semibold text-white transition-all duration-200 hover:from-purple-300 hover:via-purple-400 hover:to-purple-500 active:scale-[0.98] shadow-[0_4px_20px_-2px_rgba(168,85,247,0.5)]"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.75} />
          Host a vibe
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white ring-2 ring-purple-400/30">
            {useAppStore.getState().currentUser?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {useAppStore.getState().currentUser?.name ?? "User"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              @{useAppStore.getState().currentUser?.username ?? "viber"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarButton({
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
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-purple-500/15 text-purple-300"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-purple-500/20 text-purple-300"
            : "bg-transparent text-muted-foreground group-hover:bg-white/5 group-hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-all duration-200",
            active && "drop-shadow-[0_0_6px_rgba(192,132,252,0.6)]",
          )}
          strokeWidth={active ? 2.4 : 2}
        />
      </span>
      <span className={cn("transition-all duration-200", active ? "font-semibold" : "font-normal")}>
        {item.label}
      </span>
      {/* Active indicator dot */}
      {active && (
        <span
          aria-hidden
          className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-400"
          style={{ boxShadow: "0 0 8px rgba(192,132,252,0.9)" }}
        />
      )}
    </button>
  );
}
