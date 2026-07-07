"use client";

import {
  Compass,
  MessageCircle,
  Plus,
  User,
  Ticket,
  Bookmark,
  PartyPopper,
  LayoutDashboard,
  LogOut,
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
  badge?: number;
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
    screen: "saved",
    label: "Saved",
    icon: Bookmark,
    activeFor: ["saved"],
  },
  {
    screen: "my-parties",
    label: "My Parties",
    icon: PartyPopper,
    activeFor: ["my-parties"],
  },
  {
    screen: "host-dashboard",
    label: "Host Dashboard",
    icon: LayoutDashboard,
    activeFor: ["host-dashboard", "manage-party", "requests"],
  },
  {
    screen: "profile",
    label: "Profile",
    icon: User,
    activeFor: ["profile", "edit-profile", "admin"],
  },
];

// ── Sidebar Navigation ─────────────────────────────────────────────────────
export function SidebarNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);

  // Hide during auth flows
  if (screen === "login" || screen === "onboarding") return null;

  const firstName = currentUser?.name?.split(" ")[0] ?? "Viber";
  const avatarLetter = currentUser?.name?.[0]?.toUpperCase() ?? "V";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-border bg-background lg:flex"
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
          <span className="text-base">🎉</span>
        </div>
        <span className="text-xl font-bold tracking-tight">
          Vibe<span className="text-purple-400">Match</span>
        </span>
      </div>

      {/* User greeting */}
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-semibold text-white">
          {avatarLetter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            Hey, {firstName} 👋
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{currentUser?.username ?? "viber"}
          </p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="mt-4 flex flex-col gap-0.5 overflow-y-auto px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = item.activeFor.includes(screen);
          return (
            <SidebarItem
              key={item.label}
              item={item}
              active={active}
              onClick={() => setScreen(item.screen)}
            />
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Host CTA */}
      <div className="px-4 pb-3">
        <button
          onClick={openCreate}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 py-2.5 text-sm font-semibold text-white transition-all hover:from-purple-400 hover:to-purple-500 active:scale-[0.98] shadow-md shadow-purple-500/25"
        >
          <Plus
            className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90"
            strokeWidth={2.5}
          />
          Host a Party
        </button>
      </div>

      {/* Bottom: logout + version */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
        <p className="mt-1.5 px-3 text-[10px] text-muted-foreground/50">
          VibeMatch v1.0.0
        </p>
      </div>
    </aside>
  );
}

// ── Sidebar Item ───────────────────────────────────────────────────────────
function SidebarItem({
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
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        active
          ? "bg-purple-500/10 text-purple-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150",
          active
            ? "bg-purple-500/15 text-purple-400"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon
          className="h-[18px] w-[18px]"
          strokeWidth={active ? 2.2 : 1.8}
        />
      </span>

      {/* Label */}
      <span className={cn("flex-1 text-left", active && "font-medium")}>
        {item.label}
      </span>

      {/* Active indicator dot */}
      {active && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-purple-400"
        />
      )}

      {/* Optional badge */}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </button>
  );
}
