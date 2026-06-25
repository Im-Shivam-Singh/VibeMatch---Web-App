"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, MapPin, CalendarClock, Flame, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { CITIES, VIBE_TAGS, parseVibes } from "@/lib/types";
import { PartyCard } from "@/components/vibe/party-card";
import { EmptyState } from "@/components/vibe/empty-state";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeScreen() {
  const cityFilter = useAppStore((s) => s.cityFilter);
  const vibeFilter = useAppStore((s) => s.vibeFilter);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const setVibeFilter = useAppStore((s) => s.setVibeFilter);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", cityFilter, vibeFilter, searchQuery],
    queryFn: () =>
      api.listParties({
        city: cityFilter,
        vibe: vibeFilter,
        q: searchQuery || undefined,
      }),
  });

  const parties = data?.parties ?? [];

  // "Hot tonight" = parties happening today/tomorrow
  const hotTonight = useMemo(
    () =>
      parties.filter((p) => {
        const d = new Date(p.date + "T00:00:00");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = (target.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 1;
      }),
    [parties],
  );

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 space-y-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="glass -mx-4 px-4 pb-3 pt-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tonight in {cityFilter || "India"}
              </p>
              <h1 className="font-display text-2xl font-extrabold leading-tight">
                <span className="vibe-gradient-text">Explore</span> vibes
              </h1>
            </div>
            <button
              onClick={openCreate}
              className="flex h-10 items-center gap-1.5 rounded-full vibe-gradient-bg px-3 text-xs font-semibold text-white shadow-[0_8px_24px_-6px_rgba(236,72,153,0.6)]"
            >
              <Flame className="h-4 w-4" />
              Host
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parties, areas, vibes…"
              className="h-11 w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-pink/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* City chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <CityChip
            label="All cities"
            active={!cityFilter}
            onClick={() => setCityFilter(null)}
          />
          {CITIES.map((c) => (
            <CityChip
              key={c}
              label={c}
              active={cityFilter === c}
              onClick={() => setCityFilter(cityFilter === c ? null : c)}
            />
          ))}
        </div>

        {/* Vibe chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <CityChip
            label="All vibes"
            icon={<SlidersHorizontal className="h-3 w-3" />}
            active={!vibeFilter}
            onClick={() => setVibeFilter(null)}
          />
          {VIBE_TAGS.map((v) => (
            <CityChip
              key={v}
              label={v}
              active={vibeFilter === v}
              onClick={() => setVibeFilter(vibeFilter === v ? null : v)}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-3xl border border-border bg-card/60"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={MapPin}
            title="Couldn't load parties"
            description="Something went wrong fetching the feed. Try again."
            action={
              <button
                onClick={() => refetch()}
                className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            }
          />
        )}

        {!isLoading && !isError && parties.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="No parties match your filters"
            description="Try clearing filters or launch your own vibe to get the night started."
            action={
              <button
                onClick={openCreate}
                className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
              >
                Launch a vibe
              </button>
            }
          />
        )}

        {!isLoading && !isError && parties.length > 0 && (
          <>
            {hotTonight.length > 0 && (
              <section>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-pink" />
                  <h2 className="font-display text-sm font-semibold">
                    Hot tonight & tomorrow
                  </h2>
                </div>
                <div className="space-y-3">
                  {hotTonight.map((p) => (
                    <PartyCard key={p.id} party={p} onOpen={openParty} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-muted-foreground">
                  {cityFilter ? `All in ${cityFilter}` : "All upcoming"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {parties.length} parties
                </span>
              </div>
              <div className="space-y-3">
                {parties.map((p) => (
                  <PartyCard key={p.id} party={p} onOpen={openParty} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function CityChip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-transparent vibe-gradient-bg text-white shadow-[0_6px_20px_-8px_rgba(236,72,153,0.7)]"
          : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-pink/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
