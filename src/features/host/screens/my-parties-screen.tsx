"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Zap,
  CalendarClock,
  Users,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Flame,
  Radio,
  Clock,
  CheckCircle2,
  Settings2,
  Star,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { EmptyState } from "@/components/shared/empty-state";
import { HostAnalytics as HostAnalyticsCard } from "@/components/party/host-analytics";
import {
  currencyForCity,
  formatDateLabel,
  formatTime,
  partyLiveStatus,
  type Party,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Status badge config ────────────────────────────────────────────────
type StatusType = "live" | "starting-soon" | "upcoming" | "past";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; bg: string; text: string; icon: typeof Radio; dot: string }
> = {
  live: {
    label: "Live",
    bg: "bg-coral/15 border-coral/40",
    text: "text-coral",
    icon: Radio,
    dot: "bg-coral",
  },
  "starting-soon": {
    label: "Starting Soon",
    bg: "bg-amber-500/15 border-amber-500/40",
    text: "text-amber-300",
    icon: Clock,
    dot: "bg-amber-400",
  },
  upcoming: {
    label: "Upcoming",
    bg: "bg-purple-500/15 border-purple-500/40",
    text: "text-purple-300",
    icon: CalendarClock,
    dot: "bg-purple-400",
  },
  past: {
    label: "Past",
    bg: "bg-white/5 border-white/10",
    text: "text-muted-foreground",
    icon: CheckCircle2,
    dot: "bg-white/30",
  },
};

export function MyPartiesScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  const { data, isLoading } = useQuery({
    queryKey: ["parties", "mine", currentUser?.name],
    queryFn: () => api.listParties({ q: undefined }).then((res) => ({
      ...res,
      parties: res.parties.filter(
        (p) => p.hostName === currentUser?.name || p.hostId === currentUser?.id,
      ),
    })),
    enabled: !!currentUser,
  });

  const parties = data?.parties ?? [];

  const activeEvents = useMemo(
    () => parties.filter((p) => p.groupChatEnabled),
    [parties],
  );
  const upcomingParties = useMemo(
    () => parties.filter((p) => !p.groupChatEnabled),
    [parties],
  );

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* ── Frosted header ───────────────────────────────────────── */}
      <header



        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}


            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              My Parties
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {parties.length} {parties.length === 1 ? "party" : "parties"} hosted
            </p>
          </div>

          <button
            onClick={openCreate}


            className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white shadow-[0_0_20px_-4px_rgba(83,74,183,0.5)]"
            aria-label="Create party"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* Analytics summary */}
        {currentUser && (
          <section



            className="mb-5"
          >
            <HostAnalyticsCard hostId={currentUser.id} />
          </section>
        )}

        {/* Create CTA banner */}
        <button
          onClick={openCreate}





          className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/[0.07] p-4 text-left backdrop-blur-sm transition-colors hover:bg-purple-500/[0.12]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 shadow-[0_0_16px_-4px_rgba(83,74,183,0.3)]">
            <Plus className="h-5 w-5 text-purple-300" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-purple-200">
              Create New Party
            </p>
            <p className="text-[11px] text-purple-300/60">
              Launch a vibe and watch the requests roll in
            </p>
          </div>
          <ChevronLeft className="h-4 w-4 rotate-180 text-purple-400/40" />
        </button>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}



                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-lg bg-white/[0.06] animate-pulse" />
                    <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-white/[0.04] animate-pulse" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && parties.length === 0 && (
          <EmptyState
            icon={Flame}
            title="You haven't hosted yet"
            description="Launch your first vibe and watch the requests roll in."
            action={
              <button
                onClick={openCreate}


                className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
              >
                <Plus className="h-4 w-4" />
                Launch a vibe
              </button>
            }
          />
        )}

        {/* Active events */}
        {!isLoading && parties.length > 0 && (
          <>
            {activeEvents.length > 0 && (
              <section
                className="mb-5 space-y-3"
              >
                <div className="flex items-center gap-2 px-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-500/20">
                    <Zap className="h-3 w-3 text-teal-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    Active events
                  </span>
                  <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-500/30">
                    {activeEvents.length}
                  </span>
                </div>
                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground -mt-1">
                  Paid guests are in · group chat is live
                </p>
                <div className="space-y-3">
                  {activeEvents.map((p, i) => (
                    <ActiveEventCard key={p.id} party={p} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming parties */}
            <section
              className="space-y-3"
            >
              {upcomingParties.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/20">
                    <CalendarClock className="h-3 w-3 text-purple-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    {upcomingParties.length} parties
                  </span>
                </div>
              )}
              <div className="space-y-3">
                {upcomingParties.map((p, i) => (
                  <PartyRowCard
                    key={p.id}
                    party={p}
                    index={i + activeEvents.length}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Active event card with stats + CTAs ──────────────────────────── */

function ActiveEventCard({ party, index }: { party: Party; index: number }) {
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);

  const sym = currencyForCity(party.city);
  const paidGuests = party.guestCount;
  const capacity = party.maxGuests;
  const revenue = paidGuests * party.fee;
  const fillPct = capacity > 0 ? Math.min(100, (paidGuests / capacity) * 100) : 0;

  const openInsights = () => {
    setSelectedPartyId(party.id);
    setScreen("host-dashboard");
  };
  const openGroupChat = () => {
    setSelectedPartyId(party.id);
    setScreen("group-chat");
  };

  return (
    <div



      className="overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-500/[0.04] backdrop-blur-sm"
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                Live
              </span>
            </div>
            <h3 className="truncate font-display text-base font-bold leading-tight text-foreground">
              {party.title}
            </h3>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {formatDateLabel(party.date)} · {formatTime(party.time)} · {party.area}
            </p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Users className="h-3 w-3" />
              Paid guests
            </div>
            <p className="mt-1 font-display text-xl font-bold text-teal-300">
              {paidGuests}
              <span className="text-xs font-medium text-muted-foreground">
                {" "}/ {capacity}
              </span>
            </p>
            {/* Fill bar */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-purple-500"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Revenue
            </div>
            <p className="mt-1 font-display text-xl font-bold text-teal-300">
              {sym}{revenue}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {sym}{party.fee} per spot
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={openInsights}

            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
          >
            <BarChart3 className="h-3.5 w-3.5 text-teal-300" />
            Insights
          </button>
          <button
            onClick={openGroupChat}

            className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2.5 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-500/20"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Group chat
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Compact party row card with status badge ─────────────────────── */

function PartyRowCard({ party, index }: { party: Party; index: number }) {
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const sym = currencyForCity(party.city);

  const liveStatus = partyLiveStatus(party.date, party.time);
  const statusKey: StatusType =
    liveStatus === "live"
      ? "live"
      : liveStatus === "starting-soon"
        ? "starting-soon"
        : liveStatus === "past"
          ? "past"
          : "upcoming";
  const cfg = STATUS_CONFIG[statusKey];
  const StatusIcon = cfg.icon;
  const revenue = party.guestCount * party.fee;

  return (
    <div




      className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all hover:border-purple-500/20 hover:bg-white/[0.05] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]"
    >
      <button
        onClick={() => {
          setSelectedPartyId(party.id);
          setScreen("detail");
        }}
        className="w-full p-4 text-left"
      >
        {/* Top row: status + date */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              cfg.bg,
              cfg.text,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDateLabel(party.date)} · {formatTime(party.time)}
          </span>
        </div>

        {/* Title + area */}
        <h3 className="truncate font-display text-base font-bold text-foreground group-hover:text-purple-200 transition-colors">
          {party.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {party.area}{party.city ? `, ${party.city}` : ""}
        </p>

        {/* Quick stats */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3 text-purple-400" />
            <span className="font-medium text-foreground/80">{party.guestCount}</span>/{party.maxGuests}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 text-amber-400" />
            {party.fee === 0 ? "Free" : `${sym}${party.fee}`}
          </div>
          {revenue > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-teal-300/70">
              <TrendingUp className="h-3 w-3" />
              {sym}{revenue}
            </div>
          )}
        </div>

        {/* Action hints */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-purple-300/60 group-hover:border-purple-500/15">
            <Settings2 className="h-2.5 w-2.5" />
            Manage
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-teal-300/60 group-hover:border-teal-500/15">
            <MessageCircle className="h-2.5 w-2.5" />
            Chat
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-amber-300/60 group-hover:border-amber-500/15">
            <BarChart3 className="h-2.5 w-2.5" />
            Insights
          </span>
        </div>
      </button>
    </div>
  );
}
