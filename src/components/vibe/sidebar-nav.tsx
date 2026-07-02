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
  Settings,
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
  badge?: number; // optional count badge
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
  {
    screen: "home",
    label: "Settings",
    icon: Settings,
    activeFor: [],
  },
];

// ── Main SidebarNav ────────────────────────────────────────────────────────
export function SidebarNav() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);

  // Hide on auth flows
  if (screen === "login" || screen === "onboarding") return null;

  const firstName = currentUser?.name?.split(" ")[0] ?? "Viber";
  const avatarLetter = currentUser?.name?.[0]?.toUpperCase() ?? "V";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-white/[0.06] bg-[#0a0910]/95 backdrop-blur-xl lg:flex"
      aria-label="Primary navigation"
    >
      {/* ── Logo + Wordmark ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 ring-1 ring-purple-500/20">
          <span className="text-lg">🎉</span>
        </div>
        <div className="font-display text-xl font-extrabold tracking-tight">
          Vibe<span className="text-purple-400">Match</span>
        </div>
      </div>

      {/* ── User greeting + avatar ───────────────────────────────────── */}
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white ring-2 ring-purple-400/20">
          {avatarLetter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            Hey, {firstName} 👋
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            @{currentUser?.username ?? "viber"}
          </p>
        </div>
      </div>

      {/* ── Navigation links ─────────────────────────────────────────── */}
      <nav className="mt-4 flex flex-col gap-0.5 overflow-y-auto px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = item.activeFor.includes(screen);
          // Settings is a special case — it just goes to home for now
          const targetScreen =
            item.label === "Settings" ? "home" : item.screen;
          return (
            <SidebarButton
              key={item.label}
              item={item}
              active={active}
              onClick={() => setScreen(targetScreen)}
            />
          );
        })}
      </nav>

      {/* ── Spacer ───────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Host CTA ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <button
          onClick={openCreate}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 py-3 text-sm font-semibold text-white transition-all duration-200 hover:from-purple-300 hover:via-purple-400 hover:to-purple-500 active:scale-[0.98] shadow-[0_4px_24px_-2px_rgba(168,85,247,0.45)]"
        >
          <Plus
            className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
            strokeWidth={2.75}
          />
          Host a Party
        </button>
      </div>

      {/* ── Bottom section: logout + version ─────────────────────────── */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <button
          onClick={logout}
          className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
        <p className="mt-2 px-3 text-[10px] text-muted-foreground/50">
          VibeMatch v1.0.0
        </p>
      </div>
    </aside>
  );
}

// ── SidebarButton ──────────────────────────────────────────────────────────
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "text-purple-300"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      {/* ── Active pill background + glow ──────────────────────────── */}
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl bg-purple-500/12"
          style={{
            boxShadow: "0 0 20px -6px rgba(168,85,247,0.3)",
          }}
        />
      )}

      {/* ── Icon container ──────────────────────────────────────────── */}
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-purple-500/20 text-purple-300"
            : "bg-transparent text-muted-foreground group-hover:bg-white/[0.04] group-hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-all duration-200",
            active && "drop-shadow-[0_0_6px_rgba(192,132,252,0.6)]",
          )}
          strokeWidth={active ? 2.4 : 1.8}
        />
      </span>

      {/* ── Label ────────────────────────────────────────────────────── */}
      <span
        className={cn(
          "relative transition-all duration-200",
          active ? "font-semibold" : "font-normal",
        )}
      >
        {item.label}
      </span>

      {/* ── Active indicator dot ─────────────────────────────────────── */}
      {active && (
        <span
          aria-hidden
          className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-400"
          style={{ boxShadow: "0 0 8px rgba(192,132,252,0.9)" }}
        />
      )}

      {/* ── Optional badge ───────────────────────────────────────────── */}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </button>
  );
}
