"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Pencil,
  Flame,
  Sparkles,
  Star,
  ChevronRight,
  CalendarDays,
  Inbox as InboxIcon,
  Heart,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Moon,
  Globe,
  Crown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { RatingPill } from "@/components/vibe/rating-pill";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProfileScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);
  const logout = useAppStore((s) => s.logout);

  const { data } = useQuery({
    queryKey: ["user", currentUser?.id],
    queryFn: () => api.getUser({ id: currentUser!.id }),
    enabled: !!currentUser,
  });

  const user = data?.user ?? currentUser;

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between glass border-b border-border/60 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <h1 className="font-display text-xl font-bold">
          <span className="vibe-gradient-text">Profile</span>
        </h1>
        <button
          onClick={() => toast.info("Settings coming soon")}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="fancy-scrollbar flex-1 overflow-y-auto px-4 pb-6">
        {/* Hero */}
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <UserAvatar name={user.name} src={user.avatarUrl} size={72} ring />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold truncate">
                  {user.name}
                </h2>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                @{user.username || "viber"} · {user.city || "India"}
              </p>
              <div className="mt-1.5">
                <RatingPill rating={user.rating} count={user.ratingCount} />
              </div>
            </div>
          </div>
          {user.bio && (
            <p className="relative mt-4 text-sm text-foreground/90">{user.bio}</p>
          )}
          <button
            onClick={() => setScreen("edit-profile")}
            className="relative mt-4 inline-flex h-10 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 text-sm font-medium hover:border-pink/40"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </button>
        </section>

        {/* Stats */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat icon={<Sparkles className="h-4 w-4 text-pink" />} label="Vibes" value={user.vibes} />
          <Stat icon={<Flame className="h-4 w-4 text-amber-400" />} label="Hosted" value={user.hosted} />
          <Stat icon={<Star className="h-4 w-4 text-violet" />} label="Rating" value={user.rating.toFixed(1)} />
        </section>

        {/* Vibe score card */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-pink/10 via-violet/10 to-cyan/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Vibe score
              </p>
              <p className="font-display text-3xl font-extrabold">
                <span className="vibe-gradient-text">
                  {Math.min(999, user.vibes + user.hosted * 10)}
                </span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl vibe-gradient-bg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Host more parties & get vibes from guests to climb the leaderboard.
          </p>
        </section>

        {/* Activity */}
        <section className="mt-6">
          <h3 className="mb-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Activity
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <Row
              icon={<Flame className="h-4 w-4 text-amber-400" />}
              label="My parties"
              sub={`${user.hosted} hosted`}
              onClick={() => setScreen("my-parties")}
            />
            <Row
              icon={<InboxIcon className="h-4 w-4 text-pink" />}
              label="Requests received"
              sub="Review join requests"
              onClick={() => setScreen("requests")}
            />
            <Row
              icon={<CalendarDays className="h-4 w-4 text-cyan" />}
              label="My RSVPs"
              sub="Parties you're going to"
              onClick={() => toast.info("RSVPs coming soon")}
            />
            <Row
              icon={<Heart className="h-4 w-4 text-rose-400" />}
              label="Saved parties"
              sub="Your wishlist"
              onClick={() => toast.info("Saved parties coming soon")}
              last
            />
          </div>
        </section>

        {/* Settings */}
        <section className="mt-6">
          <h3 className="mb-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Settings
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <Row
              icon={<Bell className="h-4 w-4 text-violet" />}
              label="Notifications"
              onClick={() => toast.info("Notifications coming soon")}
            />
            <Row
              icon={<Moon className="h-4 w-4 text-indigo-300" />}
              label="Appearance"
              sub="Dark mode"
              onClick={() => toast.info("Always dark here ✨")}
            />
            <Row
              icon={<Globe className="h-4 w-4 text-cyan" />}
              label="Language"
              sub="English"
              onClick={() => toast.info("More languages coming soon")}
            />
            <Row
              icon={<Shield className="h-4 w-4 text-emerald-400" />}
              label="Privacy & safety"
              onClick={() => toast.info("Privacy settings coming soon")}
            />
            <Row
              icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
              label="Help & support"
              onClick={() => toast.info("Help center coming soon")}
              last
            />
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            toast.success("Signed out. See you on the dancefloor 💃");
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 py-3 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          VibeMatch v1.0 · Made with 💜 in India
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  onClick,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5",
        !last && "border-b border-border/40",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
