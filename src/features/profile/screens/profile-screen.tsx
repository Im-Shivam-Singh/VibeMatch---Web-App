"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Pencil,
  Flame,
  Sparkles,
  Star,
  ChevronRight,
  CalendarDays,
  Heart,
  ShieldCheck,
  LogOut,
  Globe,
  BarChart3,
  Ticket,
  Camera,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingPill } from "@/components/shared/rating-pill";
import { NotificationBell } from "@/components/shared/notification-bell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Animated count-up hook                                             */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * ease));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ------------------------------------------------------------------ */
/*  Stat pill with animated count                                      */
/* ------------------------------------------------------------------ */
function AnimatedStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  delay: number;
}) {
  const counted = useCountUp(value, 1000);
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3 py-4 text-center">
      <span className="text-purple-bright">{icon}</span>
      <p className="font-display text-2xl font-bold text-white">{counted}</p>
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/50">
        {label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick action card (2×2 grid)                                       */
/* ------------------------------------------------------------------ */
function QuickAction({
  icon,
  label,
  badge,
  onClick,
  accent = "purple",
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
  delay: number;
  accent?: "purple" | "teal" | "amber" | "coral";
}) {
  const bgMap = {
    purple: "bg-purple-500/10 border-purple-500/30",
    teal: "bg-teal-500/10 border-teal-500/30",
    amber: "bg-amber-500/10 border-amber-500/30",
    coral: "bg-coral-500/10 border-coral-500/30",
  };
  const iconBg = {
    purple: "bg-purple-500/15 text-purple-bright",
    teal: "bg-teal-500/15 text-teal-bright",
    amber: "bg-amber-500/15 text-amber-bright",
    coral: "bg-coral-500/15 text-coral-bright",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.97]",
        bgMap[accent],
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          iconBg[accent],
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold text-white/90">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-bright px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Menu row                                                           */
/* ------------------------------------------------------------------ */
function MenuRow({
  icon,
  label,
  sub,
  onClick,
  last,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.04]",
        !last && "border-b border-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          danger
            ? "bg-red-500/10 text-red-400"
            : "bg-white/[0.06] text-white/60",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            danger ? "text-red-400" : "text-white/90",
          )}
        >
          {label}
        </p>
        {sub && (
          <p className="truncate text-[11px] text-white/40">{sub}</p>
        )}
      </div>
      <ChevronRight
        className={cn("h-4 w-4", danger ? "text-red-400/60" : "text-white/30")}
      />
    </button>
  );
}

/* ================================================================== */
/*  PROFILE SCREEN                                                     */
/* ================================================================== */
export function ProfileScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const userRole = useAppStore((s) => s.userRole);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setScreen = useAppStore((s) => s.setScreen);
  const logout = useAppStore((s) => s.logout);
  const savedCount = useAppStore((s) => s.savedPartyIds.length);

  const { data } = useQuery({
    queryKey: ["user", currentUser?.id],
    queryFn: () => api.getUser({ id: currentUser!.id }),
    enabled: !!currentUser,
  });

  const user = data?.user ?? currentUser;
  const role = user?.role ?? userRole;

  if (!user) return null;

  const isHost = role === "host";

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
      {/* ---- Hero header ---- */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-deep via-purple/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(83,74,183,0.45),transparent_60%)]" />

        <div className="relative max-w-2xl mx-auto px-4 pt-[max(env(safe-area-inset-top),16px)] pb-6 lg:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between pb-4">
            <h1 className="font-display text-xl font-bold text-white">
              Profile
            </h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>

          {/* Avatar + info */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-purple-bright via-purple to-teal p-[3px]">
                <div className="rounded-full bg-background p-[2px]">
                  <UserAvatar name={user.name} src={user.avatarUrl} size={88} />
                </div>
              </div>
              {/* Camera icon overlay */}
              <button
                onClick={() => setScreen("edit-profile")}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-purple-bright shadow-lg shadow-purple/40 transition-transform active:scale-90"
                aria-label="Edit profile photo"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Name */}
            <h2 className="mt-4 font-display text-2xl font-bold text-white">
              {user.name}
            </h2>
            {/* Username */}
            <p className="mt-0.5 text-sm font-medium text-white/50">
              @{user.username || "viber"}
            </p>
            {/* Bio */}
            {user.bio && (
              <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-white/70">
                {user.bio}
              </p>
            )}
            {/* City + Profession badges */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {user.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-bright border border-teal-500/25">
                  <Globe className="h-3 w-3" />
                  {user.city}
                </span>
              )}
              {user.profession && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-bright border border-amber-500/25">
                  {user.profession}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border",
                  isHost
                    ? "bg-purple-500/15 text-purple-bright border-purple-500/35"
                    : "bg-teal-500/15 text-teal-bright border-teal-500/35",
                )}
              >
                {isHost ? "🎉 Host" : "🎊 Partier"}
              </span>
              <RatingPill rating={user.rating} count={user.ratingCount} />
              {(user.trustCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-semibold border border-teal-500/30 text-teal-bright">
                  <ShieldCheck className="h-3 w-3" />
                  TRUST {(user.trustScore ?? 5).toFixed(1)}
                  <span className="text-white/40">({user.trustCount})</span>
                </span>
              )}
            </div>

            {/* Edit profile button */}
            <button
              onClick={() => setScreen("edit-profile")}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-5 text-sm font-semibold text-white ring-1 ring-white/[0.12] transition hover:bg-white/[0.12] active:scale-[0.97]"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </button>
          </div>
        </div>
      </div>

      {/* ---- Scrollable body ---- */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden max-w-2xl mx-auto w-full px-4 pb-8 lg:px-6">
        {/* Stats row */}
        <section className="-mt-2 grid grid-cols-3 gap-2 sm:gap-3">
          <AnimatedStat
            icon={<Sparkles className="h-4 w-4" />}
            label="Vibes"
            value={user.vibes}
            delay={0.1}
          />
          <AnimatedStat
            icon={<Flame className="h-4 w-4" />}
            label="Hosted"
            value={user.hosted}
            delay={0.2}
          />
          <AnimatedStat
            icon={<Star className="h-4 w-4" />}
            label="Rating"
            value={Math.round(user.rating * 10)}
            delay={0.3}
          />
        </section>

        {/* ---- Quick actions grid ---- */}
        <section className="mt-5">
          <h3 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {isHost ? (
              <>
                <QuickAction
                  icon={<Flame className="h-5 w-5" />}
                  label="My Parties"
                  badge={user.hosted}
                  onClick={() => setScreen("my-parties")}
                  delay={0.15}
                  accent="purple"
                />
                <QuickAction
                  icon={<Heart className="h-5 w-5" />}
                  label="Saved"
                  badge={savedCount}
                  onClick={() => setScreen("saved")}
                  delay={0.2}
                  accent="coral"
                />
                <QuickAction
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Host Dashboard"
                  onClick={() => setScreen("host-dashboard")}
                  delay={0.25}
                  accent="teal"
                />
                <QuickAction
                  icon={<Ticket className="h-5 w-5" />}
                  label="Tickets"
                  onClick={() => setScreen("tickets")}
                  delay={0.3}
                  accent="amber"
                />
              </>
            ) : (
              <>
                <QuickAction
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="My RSVPs"
                  onClick={() => toast.info("RSVPs coming soon")}
                  delay={0.15}
                  accent="purple"
                />
                <QuickAction
                  icon={<Heart className="h-5 w-5" />}
                  label="Saved"
                  badge={savedCount}
                  onClick={() => setScreen("saved")}
                  delay={0.2}
                  accent="coral"
                />
                <QuickAction
                  icon={<Ticket className="h-5 w-5" />}
                  label="Tickets"
                  onClick={() => setScreen("tickets")}
                  delay={0.25}
                  accent="teal"
                />
                <QuickAction
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Host Dashboard"
                  onClick={() => setScreen("host-dashboard")}
                  delay={0.3}
                  accent="amber"
                />
              </>
            )}
          </div>
        </section>

        {/* ---- Menu items ---- */}
        <section className="mt-5">
          <h3 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Account
          </h3>
          <div className="overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <MenuRow
              icon={<Pencil className="h-4 w-4" />}
              label="Edit Profile"
              sub="Update your info"
              onClick={() => setScreen("edit-profile")}
            />
            <MenuRow
              icon={<ArrowLeftRight className="h-4 w-4" />}
              label="Change Role"
              sub={isHost ? "Switch to Partier" : "Switch to Host"}
              onClick={() => {
                const newRole = isHost ? 'partier' : 'host';
                setUserRole(newRole);
                // Also update on server
                if (currentUser?.id) {
                  fetch(`/api/users?id=${currentUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: newRole }),
                  }).catch(() => {});
                }
                toast.success(`Switched to ${newRole === 'host' ? '🎉 Host' : '🎊 Partier'} mode`);
              }}
            />
            <MenuRow
              icon={<Info className="h-4 w-4" />}
              label="About VibeMatch"
              sub="v1.0"
              onClick={() => toast.info("VibeMatch v1.0 · Made with 💛 in India")}
              last
            />
          </div>
        </section>

        {/* ---- Log out ---- */}
        <section className="mt-5">
          <div className="overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <MenuRow
              icon={<LogOut className="h-4 w-4" />}
              label="Log Out"
              onClick={() => {
                logout();
                toast.success("Signed out. See you on the dancefloor 💛");
              }}
              danger
              last
            />
          </div>
        </section>

        {/* Version footer */}
        <p className="mt-6 text-center text-[11px] text-white/25">
          VibeMatch v1.0 · Made with 💛 in India
        </p>
      </div>
    </div>
  );
}
