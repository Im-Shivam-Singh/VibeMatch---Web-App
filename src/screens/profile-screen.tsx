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
  ShieldCheck,
  HelpCircle,
  LogOut,
  Moon,
  Globe,
  Crown,
  Trophy,
  Zap,
  Award,
  Rocket,
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
  const savedCount = useAppStore((s) => s.savedPartyIds.length);

  const { data } = useQuery({
    queryKey: ["user", currentUser?.id],
    queryFn: () => api.getUser({ id: currentUser!.id }),
    enabled: !!currentUser,
  });

  const user = data?.user ?? currentUser;

  if (!user) return null;

  const vibeScore = Math.min(999, user.vibes + user.hosted * 10);
  const tiers = [
    { name: "Rookie", min: 0, icon: Rocket },
    { name: "Riser", min: 50, icon: Zap },
    { name: "Vibe", min: 150, icon: Sparkles },
    { name: "Legend", min: 400, icon: Crown },
  ];
  const currentTier = [...tiers].reverse().find((t) => vibeScore >= t.min) || tiers[0];
  const nextTier = tiers.find((t) => t.min > vibeScore);
  const tierProgress = nextTier
    ? Math.round(
        ((vibeScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100,
      )
    : 100;

  const achievements = [
    {
      icon: Rocket,
      label: "First Steps",
      desc: "Joined VibeMatch",
      unlocked: true,
    },
    {
      icon: Heart,
      label: "Curator",
      desc: "Saved 3+ parties",
      unlocked: savedCount >= 3,
    },
    {
      icon: Flame,
      label: "Host",
      desc: "Hosted a party",
      unlocked: user.hosted >= 1,
    },
    {
      icon: Star,
      label: "Rising Star",
      desc: "Reach 100 vibes",
      unlocked: user.vibes >= 100,
    },
    {
      icon: Award,
      label: "Social Butterfly",
      desc: "5+ conversations",
      unlocked: false,
    },
    {
      icon: Crown,
      label: "Legend",
      desc: "Reach 400 vibe score",
      unlocked: vibeScore >= 400,
    },
  ];

  return (
    <div className="flex h-full flex-col animate-screen-in">
      <header className="sticky top-0 z-20 flex items-center justify-between glass-strong border-b border-white/10 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <h1 className="font-display text-xl font-bold text-amber-400">
          Profile
        </h1>
        <button
          onClick={() => toast.info("Settings coming soon")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-amber-400"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="fancy-scrollbar flex-1 overflow-y-auto px-4 pb-6">
        {/* Hero */}
        <section className="relative mt-4 overflow-hidden rounded-3xl glass border border-white/10 p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-amber-400 opacity-30" />
          <div className="relative flex items-center gap-4">
            <span className="relative block rounded-full ring-2 ring-amber-400">
              <UserAvatar name={user.name} src={user.avatarUrl} size={72} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold truncate text-amber-400">
                  {user.name}
                </h2>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <p className="truncate text-sm font-medium text-white/70">
                @{user.username || "viber"} · {user.city || "India"}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <RatingPill rating={user.rating} count={user.ratingCount} />
                {/* Guest TRUST score — distinct from host rating. Shows how
                    reliable this user is as a GUEST (given by hosts). */}
                {(user.trustCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-semibold border border-teal-500/30 text-teal-300">
                    <ShieldCheck className="h-3 w-3" />
                    TRUST {(user.trustScore ?? 5).toFixed(1)}
                    <span className="text-muted-foreground">
                      ({user.trustCount})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {user.bio && (
            <p className="relative mt-4 rounded-2xl glass px-3 py-2 text-sm text-foreground/90">{user.bio}</p>
          )}
          <button
            onClick={() => setScreen("edit-profile")}
            className="relative mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-amber-400 px-4 text-sm font-semibold text-black transition active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </button>
        </section>

        {/* Stats — uniform yellow */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat icon={<Sparkles className="h-4 w-4 text-amber-400" />} label="Vibes" value={user.vibes} delay={0} />
          <Stat icon={<Flame className="h-4 w-4 text-amber-400" />} label="Hosted" value={user.hosted} delay={60} />
          <Stat icon={<Star className="h-4 w-4 text-amber-400" />} label="Rating" value={user.rating.toFixed(1)} delay={120} />
        </section>

        {/* Vibe score card with tier + progress */}
        <section className="mt-4 overflow-hidden rounded-3xl glass border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-purple-300 font-semibold">
                Vibe score
              </p>
              <p className="font-display text-3xl font-extrabold text-amber-400">
                {vibeScore}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 shadow-lg",
              )}
            >
              <currentTier.icon className="h-6 w-6 text-black" />
            </div>
          </div>

          {/* Tier + progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white">
                {currentTier.name} tier
              </span>
              {nextTier ? (
                <span className="text-muted-foreground">
                  {nextTier.min - vibeScore} to {nextTier.name}
                </span>
              ) : (
                <span className="font-semibold text-amber-400">Max tier reached 👑</span>
              )}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-700"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Host parties & get vibes from guests to climb the leaderboard.
          </p>
        </section>

        {/* Achievements / badges */}
        <section className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Achievements
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => (
              <div
                key={a.label}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition glass",
                  a.unlocked
                    ? "border-amber-400/40"
                    : "border-white/10 bg-card/20 opacity-50 grayscale",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    a.unlocked ? "bg-amber-400/10" : "bg-white/5",
                  )}
                >
                  <a.icon className={cn("h-5 w-5", a.unlocked ? "text-amber-400" : "text-muted-foreground")} />
                </div>
                <p className="text-[10px] font-semibold leading-tight">{a.label}</p>
                <p className="text-[9px] leading-tight text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Activity */}
        <section className="mt-6">
          <h3 className="mb-2 px-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
            Activity
          </h3>
          <div className="overflow-hidden rounded-2xl glass border border-white/10">
            <Row
              icon={<Flame className="h-4 w-4 text-amber-400" />}
              label="My parties"
              sub={`${user.hosted} hosted`}
              onClick={() => setScreen("my-parties")}
            />
            <Row
              icon={<InboxIcon className="h-4 w-4 text-amber-400" />}
              label="Requests received"
              sub="Review join requests"
              onClick={() => setScreen("requests")}
            />
            <Row
              icon={<CalendarDays className="h-4 w-4 text-amber-400" />}
              label="My RSVPs"
              sub="Parties you're going to"
              onClick={() => toast.info("RSVPs coming soon")}
            />
            <Row
              icon={<Heart className="h-4 w-4 text-amber-400" />}
              label="Saved parties"
              sub={`${savedCount} saved`}
              onClick={() => setScreen("saved")}
              last
            />
          </div>
        </section>

        {/* Settings */}
        <section className="mt-6">
          <h3 className="mb-2 px-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
            Settings
          </h3>
          <div className="overflow-hidden rounded-2xl glass border border-white/10">
            <Row
              icon={<Bell className="h-4 w-4 text-amber-400" />}
              label="Notifications"
              onClick={() => toast.info("Notifications coming soon")}
            />
            <Row
              icon={<Moon className="h-4 w-4 text-amber-400" />}
              label="Appearance"
              sub="Dark mode"
              onClick={() => toast.info("Always dark here ✨")}
            />
            <Row
              icon={<Globe className="h-4 w-4 text-amber-400" />}
              label="Language"
              sub="English"
              onClick={() => toast.info("More languages coming soon")}
            />
            <Row
              icon={<Shield className="h-4 w-4 text-amber-400" />}
              label="Privacy & safety"
              onClick={() => toast.info("Privacy settings coming soon")}
            />
            <Row
              icon={<HelpCircle className="h-4 w-4 text-amber-400" />}
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
            toast.success("Signed out. See you on the dancefloor 💛");
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          VibeMatch v1.0 · Made with 💛 in India
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "animate-pop-in flex flex-col items-center gap-1 rounded-2xl glass border border-amber-400/40 p-3 text-center transition",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-center">{icon}</div>
      <p className="font-display text-xl font-bold text-amber-400">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30">
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
