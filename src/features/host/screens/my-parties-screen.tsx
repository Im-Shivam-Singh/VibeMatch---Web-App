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
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { EmptyState } from "@/components/shared/empty-state";
import { HostAnalytics as HostAnalyticsCard } from "@/components/party/host-analytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  { label: string; badgeClass: string; dot: string; icon: typeof Radio }
> = {
  live: {
    label: "Live",
    badgeClass:
      "bg-teal-500/15 text-teal-300 border-teal-500/40 hover:bg-teal-500/20",
    dot: "bg-teal-400",
    icon: Radio,
  },
  "starting-soon": {
    label: "Starting Soon",
    badgeClass:
      "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/20",
    dot: "bg-amber-400",
    icon: Clock,
  },
  upcoming: {
    label: "Upcoming",
    badgeClass:
      "bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/20",
    dot: "bg-purple-400",
    icon: CalendarClock,
  },
  past: {
    label: "Past",
    badgeClass:
      "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-white/30",
    icon: CheckCircle2,
  },
};

export function MyPartiesScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["parties", "mine", currentUser?.name],
    queryFn: () =>
      api.listParties({ q: undefined }).then((res) => ({
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
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            aria-label="Back"
            className="rounded-xl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              My Parties
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {parties.length} {parties.length === 1 ? "party" : "parties"} hosted
            </p>
          </div>

          <Button
            size="icon"
            onClick={openCreate}
            aria-label="Create party"
            className="rounded-xl bg-purple-500 shadow-[0_0_20px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* Analytics summary */}
        {currentUser && (
          <section className="mb-5">
            <HostAnalyticsCard hostId={currentUser.id} />
          </section>
        )}

        {/* Create CTA banner */}
        <Card
          onClick={openCreate}
          className="mb-5 cursor-pointer border-purple-500/20 bg-purple-500/[0.07] backdrop-blur-sm py-0 transition-colors hover:bg-purple-500/[0.12] gap-0"
        >
          <CardContent className="flex items-center gap-3 p-4">
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
          </CardContent>
        </Card>

        {/* Error state */}
        {isError && (
          <Card className="border-coral/20 bg-coral/[0.04] py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 border border-coral/20">
                <RefreshCw className="h-5 w-5 text-coral" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Couldn&apos;t load parties
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "Something went wrong. Try again."}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="py-0 gap-0 border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((j) => (
                      <Skeleton key={j} className="h-14 rounded-xl" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && parties.length === 0 && (
          <EmptyState
            icon={Flame}
            title="You haven't hosted yet"
            description="Launch your first vibe and watch the requests roll in."
            action={
              <Button
                onClick={openCreate}
                className="rounded-2xl bg-purple-500 px-6 shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Launch a vibe
              </Button>
            }
          />
        )}

        {/* Active events */}
        {!isLoading && !isError && parties.length > 0 && (
          <>
            {activeEvents.length > 0 && (
              <section className="mb-5 space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-500/20">
                    <Zap className="h-3 w-3 text-teal-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    Active events
                  </span>
                  <Badge
                    variant="outline"
                    className="border-teal-500/30 bg-teal-500/15 text-teal-300 text-[10px]"
                  >
                    {activeEvents.length}
                  </Badge>
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
            <section className="space-y-3">
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
    <Card className="border-teal-500/20 bg-teal-500/[0.04] backdrop-blur-sm py-0 gap-0">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
              </span>
              <Badge
                variant="outline"
                className="border-teal-500/40 bg-teal-500/15 text-teal-300 text-[10px]"
              >
                Live
              </Badge>
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
          <Card className="border-border/40 bg-card/50 py-0 gap-0">
            <CardContent className="p-3">
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
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-purple-500"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 py-0 gap-0">
            <CardContent className="p-3">
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
            </CardContent>
          </Card>
        </div>

        {/* CTA buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={openInsights}
            className="gap-1.5 rounded-xl"
          >
            <BarChart3 className="h-3.5 w-3.5 text-teal-300" />
            Insights
          </Button>
          <Button
            variant="outline"
            onClick={openGroupChat}
            className="gap-1.5 rounded-xl border-teal-500/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 hover:text-teal-100"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Group chat
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card className="group border-border/40 bg-card/50 backdrop-blur-sm py-0 gap-0 transition-all hover:border-purple-500/20 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]">
      <button
        onClick={() => {
          setSelectedPartyId(party.id);
          setScreen("detail");
        }}
        className="w-full p-4 text-left"
      >
        {/* Top row: status + date */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant="outline" className={cn("gap-1.5 text-[10px] font-bold uppercase tracking-wider", cfg.badgeClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </Badge>
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
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-purple-300/60 group-hover:border-purple-500/15">
            <Settings2 className="h-2.5 w-2.5 mr-1" />
            Manage
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-teal-300/60 group-hover:border-teal-500/15">
            <MessageCircle className="h-2.5 w-2.5 mr-1" />
            Chat
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-amber-300/60 group-hover:border-amber-500/15">
            <BarChart3 className="h-2.5 w-2.5 mr-1" />
            Insights
          </Badge>
        </div>
      </button>
    </Card>
  );
}
