"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  MapPin,
  Heart,
  SlidersHorizontal,
  Compass,
  Mic,
  Sparkles,
  Clock,
  RefreshCw,
  PartyPopper,
  Wifi,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  VIBE_TAGS,
  VIBE_EMOJI,
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
import { EmptyState } from "@/components/shared/empty-state";
import { MusicPlayerButton } from "@/components/party/music-player";
import { PartyCard } from "@/components/party/party-card";
import { NotificationBell } from "@/components/shared/notification-bell";
import { cn, formatLocation } from "@/lib/utils";
import { toast } from "sonner";

// shadcn/ui components
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// ─── Vibe gradient map for story circles ──────────────────────────────────────
const VIBE_GRADIENT_BG: Record<string, string> = {
  "R&B": "from-purple-600 to-indigo-800",
  Bollywood: "from-green-600 to-emerald-800",
  Games: "from-teal-600 to-cyan-800",
  "Lo-fi": "from-violet-600 to-slate-800",
  Chill: "from-cyan-600 to-teal-800",
  EDM: "from-rose-600 to-pink-800",
  Retro: "from-amber-600 to-orange-800",
};

// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

// ─── Feed tab type ────────────────────────────────────────────────────────────
type FeedTab = "foryou" | "all";

// ═══════════════════════════════════════════════════════════════════════════════
// HomeScreen
// ═══════════════════════════════════════════════════════════════════════════════
export function HomeScreen() {
  // ── Store ──────────────────────────────────────────────────────────────────
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
  const userLocation = useAppStore((s) => s.userLocation);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const radiusKm = useAppStore((s) => s.radiusKm);

  // ── Local state ────────────────────────────────────────────────────────────
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude, label: "Current Location" });
      },
      (error) => {
        console.log("Geolocation denied or unavailable:", error.message);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, [setUserLocation]);

  // ── Close search suggestions on outside click ──────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── All Parties query ──────────────────────────────────────────────────────
  const {
    data: allData,
    isLoading: allLoading,
    isError: allError,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ["parties", cityFilter, vibeFilter, searchQuery, professionFilter],
    queryFn: () =>
      api.listParties({
        city: cityFilter,
        vibe: vibeFilter,
        q: searchQuery || undefined,
        profession: professionFilter || undefined,
      }),
  });

  // ── For You query ──────────────────────────────────────────────────────────
  const {
    data: forYouData,
    isLoading: forYouLoading,
    isError: forYouError,
    refetch: refetchForYou,
  } = useQuery({
    queryKey: ["forYou", currentUser?.id, userLocation, vibeFilter, searchQuery],
    queryFn: () =>
      api.forYou(
        currentUser?.id ?? "anonymous",
        userLocation ?? undefined,
      ),
    enabled: feedTab === "foryou" && !!currentUser?.id,
  });

  // ── Derived: determine active loading/error/data based on tab ──────────────
  const isLoading = feedTab === "foryou" ? forYouLoading : allLoading;
  const isError = feedTab === "foryou" ? forYouError : allError;
  const refetch = feedTab === "foryou" ? refetchForYou : refetchAll;

  // ── All parties with radius filter ─────────────────────────────────────────
  const allPartiesRaw = allData?.parties ?? [];
  const allParties = useMemo(() => {
    if (!cityFilter || radiusKm === 0) return allPartiesRaw;
    const center = CITY_CENTERS[cityFilter];
    if (!center) return allPartiesRaw;
    return allPartiesRaw.filter((p) => {
      if (p.lat == null || p.lng == null) return true;
      return haversineKm(center, { lat: p.lat, lng: p.lng }) <= radiusKm;
    });
  }, [allPartiesRaw, cityFilter, radiusKm]);

  // ── For You parties ────────────────────────────────────────────────────────
  const forYouPartiesRaw = forYouData?.parties ?? [];
  const forYouParties = useMemo(() => {
    // Apply vibe and search filters on top of for-you results
    let filtered = forYouPartiesRaw;
    if (vibeFilter) {
      filtered = filtered.filter((p) =>
        parseVibes(p.vibes).some((v) => v === vibeFilter),
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          parseVibes(p.vibes).some((v) => v.toLowerCase().includes(q)),
      );
    }
    return filtered;
  }, [forYouPartiesRaw, vibeFilter, searchQuery]);

  // ── Active filtered parties based on tab ───────────────────────────────────
  const filteredParties = feedTab === "foryou" ? forYouParties : allParties;

  // ── Hot Tonight ────────────────────────────────────────────────────────────
  const hotTonight = useMemo(
    () =>
      allParties.filter((p) => {
        const d = new Date(p.date + "T00:00:00");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = (target.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 1;
      }),
    [allParties],
  );

  // ── Near You ───────────────────────────────────────────────────────────────
  const nearYouParties = useMemo(() => {
    if (!userLocation) return [];
    return [...allParties]
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        party: p,
        distance: haversineKm(userLocation, { lat: p.lat!, lng: p.lng! }),
      }))
      .filter((x) => x.distance <= 25)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [allParties, userLocation]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setShowSearchSuggestions(false);
    setSearchFocused(false);
  };

  const clearSearch = useCallback(() => {
    setLocalSearch("");
    setSearchQuery("");
    setShowSearchSuggestions(false);
  }, [setSearchQuery]);

  const clearAllFilters = useCallback(() => {
    setVibeFilter(null);
    setSearchQuery("");
    setLocalSearch("");
  }, [setVibeFilter, setSearchQuery]);

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  const greeting = getGreeting();
  const userName = currentUser?.name?.split(" ")[0] ?? "there";
  const recentSearches = ["Lo-fi", "Koramangala", "R&B"];

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col bg-background">
      {/* ══════════ Sticky Header ══════════ */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4">
        {/* Top row: Greeting + actions */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground">
              VibeMatch
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              {greeting}, {userName}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <MusicPlayerButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScreen("filter")}
              aria-label="Filters"
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScreen("saved")}
              aria-label="Saved parties"
              className="relative rounded-xl text-muted-foreground hover:text-foreground"
            >
              <Heart className="h-4 w-4" />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white">
                  {savedCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScreen("profile")}
              aria-label="Profile"
              className="h-9 w-9 rounded-full bg-purple-500/20 text-xs font-bold text-purple-300 ring-1 ring-purple-400/30 hover:bg-purple-500/30 hover:ring-purple-400/50"
            >
              {currentUser?.name?.[0]?.toUpperCase() ?? "U"}
            </Button>
          </div>
        </div>

        {/* ══════════ Search Bar ══════════ */}
        <div ref={searchRef} className="relative mt-3">
          <form onSubmit={onSearchSubmit}>
            <div
              className={cn(
                "relative flex items-center rounded-xl border transition-all duration-200",
                searchFocused
                  ? "border-purple-500/50 bg-secondary ring-2 ring-purple-500/20"
                  : "border-border bg-secondary/60",
              )}
            >
              <Search className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  setShowSearchSuggestions(true);
                }}
                placeholder="Search areas, vibes, themes..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 h-10 pl-2 pr-12 text-sm"
              />
              <div className="absolute right-2 flex items-center gap-0.5">
                {localSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Voice search"
                  className="h-7 w-7 rounded-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/15"
                >
                  <Mic className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </form>

          {/* Search suggestions dropdown */}
          {showSearchSuggestions && !localSearch && (
            <Card className="absolute inset-x-0 top-full z-40 mt-2 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((q) => (
                    <Badge
                      key={q}
                      variant="outline"
                      className="cursor-pointer border-border/50 bg-secondary/50 text-muted-foreground transition-colors hover:bg-purple-500/15 hover:text-purple-300 hover:border-purple-500/30"
                      onClick={() => {
                        setLocalSearch(q);
                        setSearchQuery(q);
                        setShowSearchSuggestions(false);
                        setSearchFocused(false);
                      }}
                    >
                      {q}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ══════════ Feed Tabs: For You / All Parties ══════════ */}
        <div className="mt-3">
          <Tabs
            value={feedTab}
            onValueChange={(v) => setFeedTab(v as FeedTab)}
          >
            <TabsList className="bg-secondary/60 h-9">
              <TabsTrigger
                value="foryou"
                className="text-xs data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                For You
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="text-xs data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
              >
                <Compass className="h-3.5 w-3.5" />
                All Parties
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* ══════════ Scrollable Feed ══════════ */}
      <div
        ref={feedRef}
        className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-32 lg:pb-8"
      >
        {/* ── Hot Tonight — Horizontal scroll ────────────────────────────── */}
        {hotTonight.length > 0 && (
          <section className="mt-4">
            <div className="flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
                </span>
                <h2 className="font-display text-base font-bold text-foreground">
                  Hot Tonight
                </h2>
              </div>
              <Badge variant="secondary" className="text-purple-300 bg-purple-500/10 border-purple-500/20">
                {hotTonight.length} events
              </Badge>
            </div>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 lg:px-6 max-w-full">
              {hotTonight.map((p, i) => (
                <HotTonightCard key={p.id} party={p} onOpen={openParty} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Near You — Horizontal scroll ───────────────────────────────── */}
        {nearYouParties.length > 0 && (
          <section className="mt-4">
            <div className="flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-400" />
                <h2 className="font-display text-base font-bold text-foreground">
                  Near You
                </h2>
              </div>
              <Badge variant="secondary" className="text-teal-300 bg-teal-500/10 border-teal-500/20">
                {nearYouParties.length} nearby
              </Badge>
            </div>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 lg:px-6 max-w-full">
              {nearYouParties.map(({ party: p, distance }, i) => (
                <NearYouCard key={p.id} party={p} distance={distance} onOpen={openParty} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Vibe Filter — Story-style circles ──────────────────────────── */}
        <section className="mt-4">
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 lg:mx-0 lg:px-6 lg:overflow-visible">
            <VibeStory
              active={!vibeFilter}
              onClick={() => setVibeFilter(null)}
              emoji="✨"
              label="All"
              gradient="from-purple-500 to-indigo-700"
            />
            {VIBE_TAGS.map((v) => (
              <VibeStory
                key={v}
                active={vibeFilter === v}
                onClick={() => setVibeFilter(vibeFilter === v ? null : v)}
                emoji={VIBE_EMOJI[v]}
                label={v}
                gradient={VIBE_GRADIENT_BG[v] ?? "from-purple-600 to-indigo-800"}
              />
            ))}
          </div>
        </section>

        {/* ── Active filter bar ──────────────────────────────────────────── */}
        {(vibeFilter || searchQuery) && (
          <div className="px-4 lg:px-6 mt-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-purple-500/10 p-3 border border-purple-500/20">
              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs text-muted-foreground">Filters:</span>
              {vibeFilter && (
                <FilterBadge onClear={() => setVibeFilter(null)}>
                  {VIBE_EMOJI[vibeFilter]} {vibeFilter}
                </FilterBadge>
              )}
              {searchQuery && (
                <FilterBadge onClear={clearSearch}>
                  &ldquo;{searchQuery}&rdquo;
                </FilterBadge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="ml-auto h-7 text-[10px] font-semibold text-purple-300 hover:text-purple-200 px-2"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}

        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="mb-3 mt-5 flex items-baseline justify-between px-4 lg:px-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {feedTab === "foryou" ? "Curated for you" : "Discover parties"}
          </h2>
          <span className="text-xs font-semibold text-purple-300">
            {filteredParties.length} vibes
          </span>
        </div>

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {isLoading && <FeedSkeleton />}

        {/* ── Error state ────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="px-4 py-12 lg:px-6">
            <EmptyState
              icon={Wifi}
              title="Couldn't load parties"
              description="Check your connection and try again."
              action={
                <Button onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {/* ── Empty state: no parties match filters ──────────────────────── */}
        {!isLoading && !isError && filteredParties.length === 0 && (
          <div className="px-4 py-12 lg:px-6">
            {searchQuery ? (
              <EmptyState
                icon={Search}
                title="No results found"
                description={`We couldn't find anything for "${searchQuery}". Try a different search or clear your filters.`}
                action={
                  <Button variant="outline" onClick={clearAllFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                }
              />
            ) : vibeFilter ? (
              <EmptyState
                icon={PartyPopper}
                title={`No ${vibeFilter} parties right now`}
                description={`There aren't any ${vibeFilter} parties matching your criteria. Try a different vibe or check back later.`}
                action={
                  <Button variant="outline" onClick={clearAllFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                }
              />
            ) : feedTab === "foryou" ? (
              <EmptyState
                icon={Sparkles}
                title="No personalized picks yet"
                description="We're learning your vibe! Browse all parties and save a few so we can recommend better."
                action={
                  <Button variant="outline" onClick={() => setFeedTab("all")} className="gap-2">
                    <Compass className="h-4 w-4" />
                    Browse all parties
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Compass}
                title="No parties match"
                description="Try clearing filters or search for something else."
                action={
                  <Button variant="outline" onClick={clearAllFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* ── Party cards — responsive grid ──────────────────────────────── */}
        {!isLoading && !isError && filteredParties.length > 0 && (
          <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
            {filteredParties.map((p, i) => (
              <div key={p.id} className="min-w-0">
                <PartyCard party={p} onOpen={openParty} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* ── Footer hint ────────────────────────────────────────────────── */}
        {filteredParties.length > 0 && (
          <p className="mt-8 pb-4 text-center text-xs text-muted-foreground">
            That&apos;s all for now — tap the + to host your own
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─── Vibe Story Circle ────────────────────────────────────────────────────────
function VibeStory({
  active,
  onClick,
  emoji,
  label,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300",
          active
            ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-background"
            : "ring-1 ring-white/10 hover:ring-purple-500/30",
        )}
      >
        {/* Gradient background */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br transition-opacity duration-300",
            gradient,
            active ? "opacity-100" : "opacity-40",
          )}
        />
        {/* Emoji on top */}
        <span className="relative text-xl">{emoji}</span>
      </div>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors duration-200",
          active ? "text-purple-300" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Filter Badge (uses shadcn Badge) ────────────────────────────────────────
function FilterBadge({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30 hover:bg-purple-500/30 pr-1 gap-1">
      {children}
      <button
        onClick={onClear}
        aria-label="Remove filter"
        className="ml-0.5 rounded-full p-0.5 hover:bg-purple-500/30 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ─── Hot Tonight Hero Card ────────────────────────────────────────────────────
function HotTonightCard({
  party,
  onOpen,
  index,
}: {
  party: Party;
  onOpen: (id: string) => void;
  index: number;
}) {
  const vibes = parseVibes(party.vibes);
  const firstVibe = vibes[0] ?? "Chill";
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isLow = left > 0 && left <= 3;
  const isFull = left === 0;
  const status = partyLiveStatus(party.date, party.time);
  const isLive = status === "live";
  const isStartingSoon = status === "starting-soon";
  const coverSrc = party.media?.[0]?.url ?? party.coverUrl;

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
    <Card
      onClick={() => onOpen(party.id)}
      className="relative w-[280px] max-w-[80vw] shrink-0 cursor-pointer overflow-hidden rounded-2xl border-white/[0.06] bg-card/80 py-0 gap-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(83,74,183,0.2)] transition-shadow duration-300"
    >
      {/* Cover */}
      <div className="relative h-36 w-full overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={party.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br",
              VIBE_GRADIENT_BG[firstVibe] ?? "from-purple-600 to-indigo-800",
            )}
          />
        )}
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Floating vibe emoji */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-4xl opacity-25">{VIBE_EMOJI[firstVibe] ?? "🎉"}</span>
        </div>

        {/* LIVE badge */}
        {isLive && (
          <Badge className="absolute left-3 top-3 bg-coral/90 text-white border-0 gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </Badge>
        )}

        {/* Starting soon */}
        {isStartingSoon && !isLive && (
          <Badge className="absolute left-3 top-3 bg-amber-500/90 text-black border-0 gap-1 text-[10px] font-bold">
            <Sparkles className="h-3 w-3" />
            Starting soon
          </Badge>
        )}

        {/* Save heart */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          aria-label={saved ? "Unsave" : "Save"}
          className={cn(
            "absolute right-3 top-3 h-8 w-8 rounded-full border backdrop-blur-md",
            saved
              ? "bg-coral/20 border-coral/50 text-coral hover:bg-coral/30"
              : "bg-black/40 border-white/15 text-white/80 hover:bg-black/60",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", saved && "fill-coral")} />
        </Button>

        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 flex items-end justify-between p-3">
          <Badge
            className={cn(
              "border-0 shadow-lg backdrop-blur-sm text-xs font-bold",
              party.fee === 0
                ? "bg-teal-500/90 text-white"
                : "bg-amber-400/95 text-black",
            )}
          >
            {formatFee(party.fee, party.city)}
          </Badge>
          {isFull ? (
            <Badge variant="secondary" className="bg-black/50 text-white/60 border-0 backdrop-blur-sm text-[10px]">
              Sold out
            </Badge>
          ) : isLow ? (
            <Badge className="bg-coral/85 text-white border-0 backdrop-blur-sm text-[10px] font-bold animate-pulse">
              {left} left!
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-black/40 text-white/80 border-0 backdrop-blur-sm text-[10px]">
              {party.guestCount} going
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        <h3 className="mb-1 text-sm font-semibold text-foreground line-clamp-1">
          {party.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-purple-400" />
            <span className="truncate">{formatLocation(party.area, party.city)}</span>
          </span>
          <span className="shrink-0 text-white/10">·</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3 text-teal-400" />
            {formatTime(party.time)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Near You Card ────────────────────────────────────────────────────────────
function NearYouCard({
  party,
  distance,
  onOpen,
  index,
}: {
  party: Party;
  distance: number;
  onOpen: (id: string) => void;
  index: number;
}) {
  const vibes = parseVibes(party.vibes);
  const firstVibe = vibes[0] ?? "Chill";
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isLow = left > 0 && left <= 3;
  const isFull = left === 0;
  const status = partyLiveStatus(party.date, party.time);
  const isLive = status === "live";
  const coverSrc = party.media?.[0]?.url ?? party.coverUrl;

  const saved = useAppStore((s) => s.savedPartyIds.includes(party.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(party.id);
    toast.success(saved ? "Removed from saved" : "Saved to your list", {
      duration: 1500,
    });
  };

  const distLabel =
    distance < 1
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`;

  return (
    <Card
      onClick={() => onOpen(party.id)}
      className="relative w-[260px] max-w-[80vw] shrink-0 cursor-pointer overflow-hidden rounded-2xl border-teal-500/20 bg-card/80 py-0 gap-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(29,158,117,0.25)] transition-shadow duration-300"
    >
      {/* Cover */}
      <div className="relative h-32 w-full overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={party.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br",
              VIBE_GRADIENT_BG[firstVibe] ?? "from-teal-600 to-cyan-800",
            )}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Distance badge */}
        <Badge className="absolute left-3 top-3 bg-teal-500/90 text-white border-0 gap-1.5 text-[10px] font-bold">
          <MapPin className="h-3 w-3" />
          {distLabel}
        </Badge>

        {/* LIVE badge */}
        {isLive && (
          <Badge className="absolute left-3 bottom-3 bg-coral/90 text-white border-0 gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </Badge>
        )}

        {/* Save heart */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          aria-label={saved ? "Unsave" : "Save"}
          className={cn(
            "absolute right-3 top-3 h-8 w-8 rounded-full border backdrop-blur-md",
            saved
              ? "bg-coral/20 border-coral/50 text-coral hover:bg-coral/30"
              : "bg-black/40 border-white/15 text-white/80 hover:bg-black/60",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", saved && "fill-coral")} />
        </Button>

        {/* Fee + spots */}
        <div className="absolute bottom-0 inset-x-0 flex items-end justify-between p-3">
          <Badge
            className={cn(
              "border-0 shadow-lg backdrop-blur-sm text-xs font-bold",
              party.fee === 0
                ? "bg-teal-500/90 text-white"
                : "bg-amber-400/95 text-black",
            )}
          >
            {formatFee(party.fee, party.city)}
          </Badge>
          {isFull ? (
            <Badge variant="secondary" className="bg-black/50 text-white/60 border-0 backdrop-blur-sm text-[10px]">
              Sold out
            </Badge>
          ) : isLow ? (
            <Badge className="bg-coral/85 text-white border-0 backdrop-blur-sm text-[10px] font-bold animate-pulse">
              {left} left!
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-black/40 text-white/80 border-0 backdrop-blur-sm text-[10px]">
              {party.guestCount} going
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        <h3 className="mb-1 text-sm font-semibold text-foreground line-clamp-1">
          {party.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-teal-400" />
            <span className="truncate">{formatLocation(party.area, party.city)}</span>
          </span>
          <span className="shrink-0 text-white/10">·</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3 text-teal-400" />
            {formatTime(party.time)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton (using shadcn Skeleton) ────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-2xl border-border/50 bg-card/60 py-0 gap-0">
          {/* Cover skeleton */}
          <Skeleton className="h-40 w-full rounded-none" />
          {/* Body skeleton */}
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
