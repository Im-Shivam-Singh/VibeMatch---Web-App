"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Flame,
  CalendarClock,
  Zap,
  Users,
  TrendingUp,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PartyCard } from "@/components/vibe/party-card";
import { EmptyState } from "@/components/vibe/empty-state";
import { HostAnalytics as HostAnalyticsCard } from "@/components/vibe/host-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currencyForCity,
  formatDateLabel,
  formatTime,
  type Party,
} from "@/lib/types";

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

  // "Active events" = parties where at least one guest has paid (group chat
  // unlocked). These surface at the top with quick insights + a group-chat
  // shortcut so the host can jump straight into coordination.
  const activeEvents = useMemo(
    () => parties.filter((p) => p.groupChatEnabled),
    [parties],
  );
  const upcomingParties = useMemo(
    () => parties.filter((p) => !p.groupChatEnabled),
    [parties],
  );

  return (
    <div className="flex h-full flex-col animate-screen-in">
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold text-amber-400">
          My parties
        </h1>
      </header>

      <div className="fancy-scrollbar flex-1 space-y-3 overflow-y-auto p-4 pb-32">
        {currentUser && (
          <section className="mb-1">
            <HostAnalyticsCard hostId={currentUser.id} />
          </section>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-3xl glass border border-white/10"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none vibe-skeleton" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4 vibe-skeleton" />
                  <Skeleton className="h-3 w-1/2 vibe-skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && parties.length === 0 && (
          <EmptyState
            icon={Flame}
            title="You haven't hosted yet"
            description="Launch your first vibe and watch the requests roll in."
            action={
              <button
                onClick={openCreate}
                className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition active:scale-95"
              >
                Launch a vibe
              </button>
            }
          />
        )}

        {!isLoading && parties.length > 0 && (
          <>
            {/* ── Active events (paid guests → group chat unlocked) ────── */}
            {activeEvents.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-teal-300">
                  <Zap className="h-3.5 w-3.5" />
                  Active events · {activeEvents.length}
                </div>
                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground -mt-1">
                  Guests have paid · group chat is live. Tap an event for live
                  insights.
                </p>
                {activeEvents.map((p) => (
                  <ActiveEventCard key={p.id} party={p} />
                ))}
              </section>
            )}

            {/* ── Upcoming / draft parties ─────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-amber-300">
                <CalendarClock className="h-3.5 w-3.5" />{" "}
                {upcomingParties.length} parties hosted
              </div>
              {upcomingParties.map((p) => (
                <PartyCard
                  key={p.id}
                  party={p}
                  onOpen={(id) => {
                    setSelectedPartyId(id);
                    setScreen("detail");
                  }}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Active event card — compact host dashboard shortcut                        */
/*  Shows paid-guest count, projected revenue, and two CTAs:                   */
/*    1. Insights  → host-dashboard (full guest list, prep list, earnings)     */
/*    2. Group chat → group-chat screen (coordinate with paid guests)          */
/* -------------------------------------------------------------------------- */

function ActiveEventCard({ party }: { party: Party }) {
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
    <div className="teal-foil rounded-2xl p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-teal-300">
              Live
            </span>
          </div>
          <h3 className="truncate font-display text-base font-bold leading-tight text-white">
            {party.title}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {formatDateLabel(party.date)} · {formatTime(party.time)} ·{" "}
            {party.area}
          </p>
        </div>
      </div>

      {/* Insight stats */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Users className="h-3 w-3" /> Paid guests
          </div>
          <p className="mt-0.5 font-display text-lg font-bold text-teal-300">
            {paidGuests}
            <span className="text-xs font-medium text-muted-foreground">
              {" "}
              / {capacity}
            </span>
          </p>
          {/* Fill bar */}
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-purple-500 transition-all"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Revenue
          </div>
          <p className="mt-0.5 font-display text-lg font-bold text-teal-300">
            {sym}
            {revenue}
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {sym}
            {party.fee} per spot
          </p>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={openInsights}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/8 px-3 py-2.5 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/12 active:scale-[0.98]"
        >
          <BarChart3 className="h-3.5 w-3.5 text-teal-300" />
          Insights
        </button>
        <button
          onClick={openGroupChat}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-500/15 px-3 py-2.5 text-xs font-semibold text-teal-200 ring-1 ring-teal-500/40 transition hover:bg-teal-500/25 active:scale-[0.98]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Group chat
        </button>
      </div>
    </div>
  );
}
