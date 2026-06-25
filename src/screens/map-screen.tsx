"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Map as MapIcon, List, MapPin, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CITIES,
  CITY_COORDS,
  partyPinOffset,
  partyLiveStatus,
  VIBE_EMOJI,
  parseVibes,
} from "@/lib/types";
import { PartyCard } from "@/components/vibe/party-card";
import { EmptyState } from "@/components/vibe/empty-state";
import { cn } from "@/lib/utils";

// Stylized India outline path (viewBox 0 0 100 100). Not geographically
// accurate — just an artistic silhouette that wraps the city coords.
const INDIA_PATH =
  "M 30,12 Q 42,7 52,10 L 60,14 Q 68,17 70,25 L 72,33 Q 70,41 64,45 " +
  "L 60,51 Q 58,59 54,67 L 50,75 Q 46,83 40,92 L 36,88 Q 30,82 26,74 " +
  "L 20,66 Q 13,58 14,48 L 18,38 Q 22,30 28,22 Z";

const VIEW_W = 100;
const VIEW_H = 100;

export function MapScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const cityFilter = useAppStore((s) => s.cityFilter);

  // null means "All cities"
  const [selectedCity, setSelectedCity] = useState<string | null>(
    cityFilter ?? null,
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", "map", "all"],
    queryFn: () => api.listParties(),
  });

  const parties = data?.parties ?? [];

  // Group parties by city (only cities with coords are mappable).
  const clusters = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of CITIES) map.set(c, 0);
    for (const p of parties) {
      if (map.has(p.city)) map.set(p.city, (map.get(p.city) ?? 0) + 1);
    }
    return CITIES.map((city) => ({
      city,
      count: map.get(city) ?? 0,
      coords: CITY_COORDS[city] ?? { x: 0.5, y: 0.5 },
    }));
  }, [parties]);

  const totalParties = parties.length;

  const visibleParties = useMemo(() => {
    if (!selectedCity) return parties;
    return parties.filter((p) => p.city === selectedCity);
  }, [parties, selectedCity]);

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  const handleCityClick = (city: string) => {
    setSelectedCity((prev) => (prev === city ? null : city));
  };

  const handleListToggle = () => {
    // Keep the currently-selected city in sync with the explore filter
    setCityFilter(selectedCity);
    setScreen("home");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 glass border-b border-border/60 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold leading-tight">
            <span className="vibe-gradient-text">Vibe Map</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {totalParties} parties · {clusters.filter((c) => c.count > 0).length}{" "}
            cities live
          </p>
        </div>
        <button
          onClick={handleListToggle}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 text-xs font-semibold text-foreground transition hover:border-pink/40"
          aria-label="Switch to list view"
        >
          <List className="h-4 w-4" />
          List
        </button>
      </header>

      {/* Map canvas */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet/10 via-background to-cyan/5" />

        {/* Map surface */}
        <div className="relative mx-auto h-full w-full max-h-[52vh]">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <radialGradient id="map-aura" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="rgba(168,85,247,0.18)" />
                <stop offset="60%" stopColor="rgba(236,72,153,0.06)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <linearGradient id="india-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(168,85,247,0.10)" />
                <stop offset="50%" stopColor="rgba(236,72,153,0.06)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.06)" />
              </linearGradient>
              <filter id="india-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Soft aura behind the map */}
            <ellipse
              cx={50}
              cy={50}
              rx={45}
              ry={48}
              fill="url(#map-aura)"
            />

            {/* India silhouette */}
            <path
              d={INDIA_PATH}
              fill="url(#india-fill)"
              stroke="rgba(168,85,247,0.45)"
              strokeWidth={0.4}
              filter="url(#india-glow)"
            />

            {/* Faint lat/long grid for vibe */}
            {[20, 40, 60, 80].map((g) => (
              <line
                key={`h-${g}`}
                x1={0}
                y1={g}
                x2={100}
                y2={g}
                stroke="rgba(168,85,247,0.06)"
                strokeWidth={0.2}
              />
            ))}
            {[20, 40, 60, 80].map((g) => (
              <line
                key={`v-${g}`}
                x1={g}
                y1={0}
                x2={g}
                y2={100}
                stroke="rgba(168,85,247,0.06)"
                strokeWidth={0.2}
              />
            ))}
          </svg>

          {/* Party pins (under the city clusters so the cluster sits on top) */}
          {selectedCity &&
            visibleParties.map((p) => {
              const off = partyPinOffset(p.id, p.city);
              const status = partyLiveStatus(p.date, p.time);
              const isLive = status === "live";
              const isStarting = status === "starting-soon";
              const vibes = parseVibes(p.vibes);
              const emoji = vibes[0] ? VIBE_EMOJI[vibes[0]] ?? "✨" : "✨";
              return (
                <button
                  key={p.id}
                  onClick={() => openParty(p.id)}
                  className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${off.x * VIEW_W}%`,
                    top: `${off.y * VIEW_H}%`,
                  }}
                  aria-label={`${p.title} — ${p.city}`}
                >
                  {/* live ping */}
                  {(isLive || isStarting) && (
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        isLive
                          ? "bg-rose-500/40 animate-ping"
                          : "bg-amber-400/40 animate-ping",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] transition-transform group-hover:scale-125",
                      isLive
                        ? "bg-rose-500 shadow-[0_0_12px_-2px_rgba(244,63,94,0.8)]"
                        : isStarting
                          ? "bg-amber-400 shadow-[0_0_12px_-2px_rgba(251,191,36,0.7)]"
                          : "vibe-gradient-bg shadow-[0_0_10px_-2px_rgba(236,72,153,0.7)]",
                    )}
                  >
                    <span className="opacity-90">{emoji}</span>
                  </span>
                  {/* Hover label */}
                  <span className="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-card/90 px-1.5 py-0.5 text-[9px] font-medium text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    {p.title}
                  </span>
                </button>
              );
            })}

          {/* City clusters */}
          {clusters.map((c) => {
            const isActive = selectedCity === c.city;
            const hasParties = c.count > 0;
            const cityLive = parties.some(
              (p) =>
                p.city === c.city &&
                partyLiveStatus(p.date, p.time) === "live",
            );
            return (
              <button
                key={c.city}
                onClick={() => hasParties && handleCityClick(c.city)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${c.coords.x * VIEW_W}%`,
                  top: `${c.coords.y * VIEW_H}%`,
                }}
                aria-label={`${c.city}${hasParties ? ` — ${c.count} parties` : " — no parties"}`}
                aria-pressed={isActive}
              >
                <div className="relative flex flex-col items-center">
                  {/* outer ping ring (only if parties exist) */}
                  {hasParties && (
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        isActive
                          ? "bg-pink/30 animate-ping"
                          : cityLive
                            ? "bg-rose-500/25 animate-ping"
                            : "bg-violet/25 animate-ping",
                      )}
                    />
                  )}

                  {/* halo glow */}
                  {hasParties && (
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md",
                        isActive
                          ? "h-8 w-8 bg-pink/50"
                          : "h-6 w-6 bg-violet/40",
                      )}
                    />
                  )}

                  {/* main dot */}
                  <span
                    className={cn(
                      "relative flex items-center justify-center rounded-full border transition-all duration-300",
                      isActive
                        ? "h-7 w-7 border-pink/60 vibe-gradient-bg glow-pink"
                        : hasParties
                          ? "h-5 w-5 border-violet/50 bg-card/80 vibe-gradient-bg"
                          : "h-3.5 w-3.5 border-border bg-card/60",
                    )}
                  >
                    {/* count badge */}
                    {hasParties && (
                      <span
                        className={cn(
                          "absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white border border-background",
                          isActive ? "bg-rose-500" : "bg-violet",
                        )}
                      >
                        {c.count}
                      </span>
                    )}
                    {/* live pulse dot */}
                    {cityLive && (
                      <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
                    )}
                  </span>

                  {/* city label */}
                  <span
                    className={cn(
                      "mt-1 whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors",
                      isActive
                        ? "text-pink"
                        : hasParties
                          ? "text-foreground/90"
                          : "text-muted-foreground/70",
                    )}
                  >
                    {c.city}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Empty / loading overlay */}
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full glass px-4 py-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-pink" />
                Loading the map…
              </div>
            </div>
          )}

          {isError && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <EmptyState
                icon={MapPin}
                title="Couldn't load the map"
                description="Something went wrong fetching parties. Try again."
                action={
                  <button
                    onClick={() => refetch()}
                    className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                }
              />
            </div>
          )}

          {!isLoading &&
            !isError &&
            totalParties === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <EmptyState
                  icon={MapIcon}
                  title="No parties on the map yet"
                  description="Be the first to drop a pin — launch a vibe and it'll show up here."
                  action={
                    <button
                      onClick={() => setScreen("create")}
                      className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
                    >
                      Launch a vibe
                    </button>
                  }
                />
              </div>
            )}
        </div>
      </div>

      {/* Bottom sheet: city pills + party list */}
      <section className="glass relative z-10 flex max-h-[42vh] flex-col border-t border-border/60">
        {/* grab handle */}
        <div className="mx-auto my-2 h-1 w-10 rounded-full bg-border/70" />

        {/* City pills */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          <CityPill
            label="All cities"
            count={totalParties}
            active={selectedCity === null}
            onClick={() => setSelectedCity(null)}
          />
          {clusters
            .filter((c) => c.count > 0)
            .map((c) => (
              <CityPill
                key={c.city}
                label={c.city}
                count={c.count}
                active={selectedCity === c.city}
                onClick={() => handleCityClick(c.city)}
              />
            ))}
        </div>

        {/* List */}
        <div className="fancy-scrollbar flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">
              {selectedCity ? (
                <>
                  Parties in{" "}
                  <span className="vibe-gradient-text">{selectedCity}</span>
                </>
              ) : (
                <>
                  <span className="vibe-gradient-text">All cities</span>
                </>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">
              {visibleParties.length}{" "}
              {visibleParties.length === 1 ? "party" : "parties"}
            </span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-3xl border border-border bg-card/40"
                />
              ))}
            </div>
          )}

          {!isLoading && visibleParties.length === 0 && (
            <EmptyState
              icon={MapPin}
              title={
                selectedCity
                  ? `No parties in ${selectedCity} yet`
                  : "No parties to show"
              }
              description={
                selectedCity
                  ? "Try another city, or launch your own vibe here."
                  : "Launch your own vibe to get the night started."
              }
              action={
                <button
                  onClick={() => setScreen("create")}
                  className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
                >
                  Launch a vibe
                </button>
              }
            />
          )}

          {!isLoading &&
            visibleParties.length > 0 &&
            visibleParties.map((p) => (
              <PartyCard key={p.id} party={p} onOpen={openParty} />
            ))}
        </div>
      </section>
    </div>
  );
}

function CityPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-transparent vibe-gradient-bg text-white shadow-[0_6px_20px_-8px_rgba(236,72,153,0.7)]"
          : "border-border/60 bg-card/60 text-muted-foreground hover:border-pink/40 hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
          active ? "bg-white/25 text-white" : "bg-violet/30 text-foreground/80",
        )}
      >
        {count}
      </span>
    </button>
  );
}
