"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, Settings2, MapPin, Navigation, Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { CITIES, PROFESSIONS, VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateFilter = "tonight" | "weekend" | "next-week";

const DATE_FILTERS: { id: DateFilter; label: string; emoji: string }[] = [
  { id: "tonight", label: "Tonight", emoji: "🌙" },
  { id: "weekend", label: "This weekend", emoji: "🎉" },
  { id: "next-week", label: "Next week", emoji: "📅" },
];

const PRICE_LABELS = ["Free", "£4", "£8", "£12", "£15+"] as const;

export function FilterScreen() {
  const cityFilter = useAppStore((s) => s.cityFilter);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const radiusKm = useAppStore((s) => s.radiusKm);
  const setRadiusKm = useAppStore((s) => s.setRadiusKm);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const professionFilter = useAppStore((s) => s.professionFilter);
  const setProfessionFilter = useAppStore((s) => s.setProfessionFilter);
  const currentUser = useAppStore((s) => s.currentUser);
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const vibeFilter = useAppStore((s) => s.vibeFilter);

  const [priceValue, setPriceValue] = useState(9);
  const [dateFilter, setDateFilter] = useState<DateFilter | null>("weekend");
  const [selectedVibes, setSelectedVibes] = useState<string[]>(
    vibeFilter ? [vibeFilter] : [],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["parties", "filter", cityFilter, searchQuery, professionFilter, priceValue, dateFilter],
    queryFn: () =>
      api.listParties({
        city: cityFilter,
        q: searchQuery.trim() || undefined,
      }),
  });

  const matchCount = data?.parties?.length ?? 0;

  const applyAndGo = () => {
    if (currentUser && professionFilter && professionFilter !== currentUser.profession) {
      api
        .updateUser(currentUser.id, { profession: professionFilter } as any)
        .then(() => {
          useAppStore.setState((s) => ({
            currentUser: s.currentUser
              ? { ...s.currentUser, profession: professionFilter }
              : s.currentUser,
          }));
        })
        .catch(() => {});
    }
    setScreen("home");
  };

  const priceLabel =
    priceValue === 0 ? "Free"
      : priceValue >= 15 ? "£15+"
        : `Up to £${priceValue}`;

  const hasActiveFilters = !!cityFilter || !!professionFilter || !!searchQuery.trim() || selectedVibes.length > 0;

  const clearAll = () => {
    setCityFilter(null);
    setProfessionFilter(null);
    setSearchQuery("");
    setSelectedVibes([]);
    setPriceValue(9);
    setDateFilter("weekend");
  };

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  };

  const sliderClasses =
    "[&_[data-slot=slider-track]]:h-[3px] " +
    "[&_[data-slot=slider-track]]:rounded-full " +
    "[&_[data-slot=slider-track]]:bg-white/[0.06] " +
    "[&_[data-slot=slider-range]]:bg-purple-500 " +
    "[&_[data-slot=slider-thumb]]:size-5 " +
    "[&_[data-slot=slider-thumb]]:border-2 " +
    "[&_[data-slot=slider-thumb]]:border-white " +
    "[&_[data-slot=slider-thumb]]:bg-purple-500 " +
    "[&_[data-slot=slider-thumb]]:shadow-[0_2px_10px_-2px_rgba(83,74,183,0.8)] " +
    "[&_[data-slot=slider-thumb]]:ring-0 " +
    "[&_[data-slot=slider-thumb]]:hover:ring-0 " +
    "[&_[data-slot=slider-thumb]]:focus-visible:ring-2 " +
    "[&_[data-slot=slider-thumb]]:focus-visible:ring-purple-300/50";

  return (
    <div className="relative flex h-full w-full max-w-[100vw] overflow-x-hidden flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Step 2 of 9 · Guest</span>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">Filter parties</h1>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 transition hover:bg-purple-500/20"
          >
            <Settings2 className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-6 overflow-y-auto p-4 pb-40">
        {/* Search */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by place, area or city…"
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-9 pr-9 text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.section>

        {/* City selector — radio-style cards */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">City</span>
          <div className="grid grid-cols-2 gap-2">
            {CITIES.map((c) => {
              const selected = cityFilter === c;
              return (
                <motion.button
                  key={c}
                  type="button"
                  onClick={() => setCityFilter(selected ? null : c)}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                    selected
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-200 shadow-[0_0_16px_-4px_rgba(83,74,183,0.2)]"
                      : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/[0.12]",
                  )}
                >
                  <MapPin className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-purple-400" : "text-muted-foreground/50")} />
                  {c}
                </motion.button>
              );
            })}
          </div>

          {/* Radius slider */}
          {cityFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-purple-300/80 font-medium">
                  <Navigation className="h-3.5 w-3.5" />
                  Nearby
                </span>
                <span className="text-sm font-medium text-purple-300 tabular-nums">
                  {radiusKm === 0 ? "City-wide" : `Within ${radiusKm} km`}
                </span>
              </div>
              <Slider value={[radiusKm]} onValueChange={(v) => setRadiusKm(v[0] ?? 0)} min={0} max={50} step={1} aria-label="Nearby radius" className={sliderClasses} />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
                <span>City-wide</span>
                <span>25</span>
                <span>50 km</span>
              </div>
            </motion.div>
          )}
        </motion.section>

        {/* Vibe multi-select */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Vibe</span>
            {selectedVibes.length > 0 && (
              <button onClick={() => setSelectedVibes([])} className="text-[10px] text-purple-300/60 hover:text-purple-300 hover:underline underline-offset-2">
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((v) => {
              const selected = selectedVibes.includes(v);
              return (
                <motion.button
                  key={v}
                  type="button"
                  onClick={() => toggleVibe(v)}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    selected
                      ? (VIBE_COLORS[v] ?? "bg-purple-500/15 text-purple-300 border-purple-500/40")
                      : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/[0.15]",
                  )}
                >
                  <span className="text-[0.85em] leading-none">{VIBE_EMOJI[v] ?? "✨"}</span>
                  {v}
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* Profession */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Who are you?</span>
            {professionFilter && (
              <button onClick={() => setProfessionFilter(null)} className="text-[10px] text-purple-300/60 hover:text-purple-300 hover:underline underline-offset-2">Clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PROFESSIONS.map((p) => {
              const selected = professionFilter === p;
              return (
                <motion.button
                  key={p}
                  type="button"
                  onClick={() => setProfessionFilter(selected ? null : p)}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    selected
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                      : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground/50">We&apos;ll match you with parties hosted by your crowd.</p>
        </motion.section>

        {/* Price range */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Price range</span>
            <span className="text-sm font-medium text-purple-300 tabular-nums">{priceLabel}</span>
          </div>
          <Slider value={[priceValue]} onValueChange={(v) => setPriceValue(v[0] ?? 0)} min={0} max={15} step={1} aria-label="Maximum entry price" className={sliderClasses} />
          <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
            {PRICE_LABELS.map((l) => <span key={l}>{l}</span>)}
          </div>
        </motion.section>

        {/* Date */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Date</span>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((d) => {
              const selected = dateFilter === d.id;
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  onClick={() => setDateFilter(selected ? null : d.id)}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                    selected
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                      : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{d.emoji}</span>
                  {d.label}
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="absolute inset-x-0 bottom-[84px] z-30 mx-auto max-w-[480px] px-3">
        <div className="rounded-2xl border border-white/[0.06] bg-background/80 backdrop-blur-2xl p-3 shadow-[0_-6px_30px_-10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <motion.button
                onClick={clearAll}
                whileTap={{ scale: 0.95 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition hover:text-white"
                aria-label="Clear all filters"
              >
                <RotateCcw className="h-4 w-4" />
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={applyAndGo}
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-500 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] transition hover:bg-purple-400 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Counting…
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-4 w-4" />
                  Show {matchCount} matching parties
                </>
              )}
            </motion.button>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAll} className="mt-2 w-full text-center text-[10px] text-muted-foreground/50 hover:text-muted-foreground">
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
