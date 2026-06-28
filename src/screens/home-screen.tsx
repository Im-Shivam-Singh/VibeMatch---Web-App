"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  MapPin,
  Heart,
  SlidersHorizontal,
  Ticket as TicketIcon,
  Compass,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CITIES,
  VIBE_TAGS,
  VIBE_EMOJI,
  VIBE_COLORS,
  parseVibes,
  formatFee,
  formatDateLabel,
  formatTime,
  slotsLeft,
  partyLiveStatus,
  currencyForCity,
  CITY_CENTERS,
  haversineKm,
  type Party,
} from "@/lib/types";
import { EmptyState } from "@/components/vibe/empty-state";
import { MusicPlayerButton } from "@/components/vibe/music-player";
import { cn, formatLocation } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Tab = "house" | "social";

// Hero background per first vibe — matches the spec's slide 3 hero colors
const HERO_BG: Record<string, string> = {
  "R&B": "#1a1035",
  Bollywood: "#1a2410",
  BYOB: "#1a1035",
  Games: "#0d1f2d",
  "Lo-fi": "#1a1035",
  Chill: "#0d1f2d",
  EDM: "#1a1035",
  Retro: "#0d1f2d",
};

export function HomeScreen() {
  const cityFilter = useAppStore((s) => s.cityFilter);
  const vibeFilter = useAppStore((s) => s.vibeFilter);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const professionFilter = useAppStore((s) => s.professionFilter);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const setVibeFilter = useAppStore((s) => s.setVibeFilter);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const savedCount = useAppStore((s) => s.savedPartyIds.length);
  const currentUser = useAppStore((s) => s.currentUser);

  const [tab, setTab] = useState<Tab>("house");
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", cityFilter, vibeFilter, searchQuery, professionFilter],
    queryFn: () =>
      api.listParties({
        city: cityFilter,
        vibe: vibeFilter,
        q: searchQuery || undefined,
        profession: professionFilter || undefined,
      }),
  });

  // Radius filter — when the user has selected a city + set a nearby radius,
  // narrow the feed to parties within that distance of the city center.
  const radiusKm = useAppStore((s) => s.radiusKm);
  const allParties = data?.parties ?? [];
  const parties = useMemo(() => {
    if (!cityFilter || radiusKm === 0) return allParties;
    const center = CITY_CENTERS[cityFilter];
    if (!center) return allParties;
    return allParties.filter((p) => {
      if (p.lat == null || p.lng == null) return false;
      return haversineKm(center, { lat: p.lat, lng: p.lng }) <= radiusKm;
    });
  }, [allParties, cityFilter, radiusKm]);

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

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  const clearSearch = () => {
    setLocalSearch("");
    setSearchQuery("");
  };

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 glass-strong px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4">
        <div className="flex items-center justify-between">
          {/* Hide VibeMatch logo on desktop since sidebar shows it */}
          <div className="font-display text-lg font-extrabold tracking-tight lg:hidden">
            Vibe<span className="text-purple-400">Match</span>
          </div>
          <div className="flex items-center gap-2">
            <MusicPlayerButton />
            <button
              onClick={() => setScreen("filter")}
              aria-label="Filter parties"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={() => setScreen("saved")}
              aria-label="Saved parties"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart className="h-4 w-4" />
              {savedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white">
                  {savedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setScreen("profile")}
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white ring-2 ring-purple-400/30"
            >
              {currentUser?.name?.[0]?.toUpperCase() ?? "U"}
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={onSearchSubmit} className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search areas, themes…"
            className="w-full rounded-xl border border-border bg-secondary py-2.5 pl-10 pr-9 text-sm leading-none text-foreground placeholder:text-muted-foreground/80 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/25 lg:max-w-md"
          />
          {localSearch && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 rounded-xl bg-secondary p-1">
          <TabButton active={tab === "house"} onClick={() => setTab("house")} emoji="🏠">
            House parties
          </TabButton>
          <TabButton active={tab === "social"} onClick={() => setTab("social")} emoji="☕">
            Social meetups
          </TabButton>
        </div>
      </header>

      {/* Scrollable feed */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto px-4 pb-32 pt-4 lg:px-6 lg:pb-8">
        {/* Sub-header */}
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold lg:text-lg">Happening near you</h2>
          <span className="text-xs font-semibold text-purple-200">{parties.length} vibes</span>
        </div>

        {/* City filter chips */}
        <div className="no-scrollbar -mx-4 mb-4 flex flex-wrap gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
          <CityChip
            active={!cityFilter}
            onClick={() => setCityFilter(null)}
            label="All cities"
          />
          {CITIES.map((c) => (
            <CityChip
              key={c}
              active={cityFilter === c}
              onClick={() => setCityFilter(cityFilter === c ? null : c)}
              label={c}
            />
          ))}
        </div>

        {/* Vibe filter stories */}
        <div className="no-scrollbar -mx-4 mb-5 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0 lg:overflow-visible lg:flex-wrap">
          <VibeStory
            active={!vibeFilter}
            onClick={() => setVibeFilter(null)}
            emoji="✨"
            label="All"
          />
          {VIBE_TAGS.map((v) => (
            <VibeStory
              key={v}
              active={vibeFilter === v}
              onClick={() => setVibeFilter(vibeFilter === v ? null : v)}
              emoji={VIBE_EMOJI[v]}
              label={v}
            />
          ))}
        </div>

        {/* Active filter bar */}
        {(cityFilter || vibeFilter || searchQuery) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-purple-500/10 p-2.5 border border-purple-500/20">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {cityFilter && (
              <FilterTag onClear={() => setCityFilter(null)}>
                📍 {cityFilter}
              </FilterTag>
            )}
            {vibeFilter && (
              <FilterTag onClear={() => setVibeFilter(null)}>
                {VIBE_EMOJI[vibeFilter]} {vibeFilter}
              </FilterTag>
            )}
            {searchQuery && (
              <FilterTag onClear={clearSearch}>"{searchQuery}"</FilterTag>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && <FeedSkeleton />}

        {/* Error */}
        {isError && (
          <div className="py-12">
            <EmptyState
              icon={Search}
              title="Couldn't load parties"
              description="Check your connection and try again."
              action={
                <button
                  onClick={() => refetch()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Retry
                </button>
              }
            />
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && parties.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={Compass}
              title="No parties match"
              description="Try clearing filters or exploring a different city."
              action={
                <button
                  onClick={() => {
                    setCityFilter(null);
                    setVibeFilter(null);
                    setSearchQuery("");
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Clear filters
                </button>
              }
            />
          </div>
        )}

        {/* Party cards — responsive grid */}
        {!isLoading && !isError && parties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parties.map((p) => (
              <PartyCardNew key={p.id} party={p} onOpen={openParty} />
            ))}
          </div>
        )}

        {/* Footer hint */}
        {parties.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            That's all for now — tap the + to host your own
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  emoji: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200",
        active
          ? "bg-purple-500/25 text-purple-200 shadow-sm shadow-purple-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
      )}
    >
      <span className={cn("mr-1 transition-transform duration-200 inline-block", active && "scale-110")}>{emoji}</span>
      {children}
    </button>
  );
}

function CityChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
        active
          ? "border-purple-500/50 bg-purple-500/25 text-purple-200"
          : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-purple-500/30",
      )}
    >
      {label}
    </button>
  );
}

function VibeStory({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl transition-all duration-200",
          active
            ? "border-purple-400 bg-purple-500/20 glow-violet"
            : "border-border bg-secondary hover:border-purple-500/30 hover:bg-white/5",
        )}
      >
        {emoji}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-purple-300" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function FilterTag({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-1 text-xs text-purple-200">
      {children}
      <button
        onClick={onClear}
        aria-label="Remove filter"
        className="rounded-full hover:bg-purple-500/30"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// The spec's party card — m-card pattern at full mobile size
function PartyCardNew({
  party,
  onOpen,
}: {
  party: Party;
  onOpen: (id: string) => void;
}) {
  const vibes = parseVibes(party.vibes).slice(0, 3);
  const firstVibe = vibes[0] ?? "Chill";
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isLow = left > 0 && left <= 2;
  const isFull = left === 0;
  const going = party.guestCount;
  const sym = currencyForCity(party.city);
  const saved = useAppStore((s) => s.savedPartyIds.includes(party.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(party.id);
    toast.success(saved ? "Removed from saved" : "Saved to your list", {
      duration: 1500,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(party.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(party.id)}
      className="group overflow-hidden rounded-2xl border border-border bg-white/[0.04] transition-all duration-200 hover:border-purple-500/40 hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer"
    >
      {/* Cover */}
      <div
        className="relative flex h-28 items-center justify-center"
        style={{ background: HERO_BG[firstVibe] ?? "#1a1035" }}
      >
        {/* Gradient overlay for text readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <span className="relative text-4xl">{VIBE_EMOJI[firstVibe] ?? "🎉"}</span>

        {/* Theme pill (bottom-left) */}
        <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {firstVibe} night
        </span>

        {/* Spots pill (bottom-right) */}
        {isFull ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/70">
            Sold out
          </span>
        ) : isLow ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-coral-500/85 px-2 py-0.5 text-[10px] font-bold text-white">
            {left} left!
          </span>
        ) : (
          <span className="absolute bottom-2 right-2 rounded-md bg-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {going} going
          </span>
        )}

        {/* Save heart (top-right) */}
        <button
          onClick={onSave}
          aria-label={saved ? "Unsave party" : "Save party"}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <Heart
            className={cn("h-3.5 w-3.5", saved ? "fill-coral-500 text-coral-500" : "fill-transparent")}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{party.title}</h3>
          <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300">
            {formatFee(party.fee, party.city)}
          </span>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          📅 {formatDateLabel(party.date)} · {formatTime(party.time)} · 📍 {formatLocation(party.area, party.city)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {vibes.map((v) => (
            <span
              key={v}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                VIBE_COLORS[v] ?? "bg-white/5 text-muted-foreground border-border",
              )}
            >
              {v}
            </span>
          ))}
          <span className="rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            👥 Max {party.maxGuests}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-white/[0.04]"
        >
          <Skeleton className="h-28 w-full rounded-none bg-white/5" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-2/3 bg-white/5" />
            <Skeleton className="h-3 w-4/5 bg-white/5" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
              <Skeleton className="h-5 w-10 rounded-full bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
