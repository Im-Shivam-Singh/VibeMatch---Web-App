"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Settings2, MapPin, Search, X, SlidersHorizontal, RotateCcw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PROFESSIONS, VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const { data, isLoading, isError, refetch } = useQuery({
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
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            className="h-10 w-10 rounded-xl border-white/[0.08] text-white/80"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Filters</span>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">Filter parties</h1>
          </div>
          <Badge variant="outline" className="h-10 w-10 p-0 items-center justify-center rounded-xl bg-purple-500/10 border-purple-500/20 text-purple-300">
            <Settings2 className="h-4 w-4" />
          </Badge>
        </div>
      </header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 min-h-0 space-y-6 overflow-y-auto overflow-x-hidden p-4 pb-40">
        {/* Search */}
        <Card className="border-white/[0.06] bg-white/[0.02] rounded-xl">
          <CardContent className="p-4 space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by place, area or city…"
                className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-9 pr-9 text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              />
              {searchQuery.trim() && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* City input */}
        <Card className="border-white/[0.06] bg-white/[0.02] rounded-xl">
          <CardContent className="p-4 space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">City</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
              <Input
                value={cityFilter || ""}
                onChange={(e) => setCityFilter(e.target.value || null)}
                placeholder="Enter a city…"
                className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-9 pr-9 text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
                maxLength={60}
              />
              {cityFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCityFilter(null)}
                  aria-label="Clear city"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vibe multi-select */}
        <Card className="border-white/[0.06] bg-white/[0.02] rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Vibe</Label>
              {selectedVibes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVibes([])}
                  className="text-[10px] text-purple-300/60 hover:text-purple-300 h-auto py-0 px-1"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map((v) => {
                const selected = selectedVibes.includes(v);
                return (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVibe(v)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full text-sm font-medium h-auto py-1.5 px-3",
                      selected
                        ? (VIBE_COLORS[v] ?? "bg-purple-500/15 text-purple-300 border-purple-500/40")
                        : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/[0.15]",
                    )}
                  >
                    <span className="text-[0.85em] leading-none">{VIBE_EMOJI[v] ?? "✨"}</span>
                    {v}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Profession */}
        <Card className="border-white/[0.06] bg-white/[0.02] rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Who are you?</Label>
              {professionFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProfessionFilter(null)}
                  className="text-[10px] text-purple-300/60 hover:text-purple-300 h-auto py-0 px-1"
                >
                  Clear
                </Button>
              )}
            </div>
            <Select
              value={professionFilter ?? undefined}
              onValueChange={(val) => setProfessionFilter(val || null)}
            >
              <SelectTrigger className="w-full rounded-xl border-white/[0.08] bg-white/[0.04] h-12">
                <SelectValue placeholder="Select your crowd…" />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {professionFilter && (
              <Badge variant="outline" className="rounded-full border-purple-500/30 bg-purple-500/10 text-purple-200">
                {professionFilter}
              </Badge>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground/50">We&apos;ll match you with parties hosted by your crowd.</p>
          </CardContent>
        </Card>

        {/* Price range */}
        <Card className="border-white/[0.06] bg-white/[0.03] rounded-xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Price range</Label>
              <Badge variant="outline" className="text-sm font-medium text-purple-300 tabular-nums border-purple-500/30">
                {priceLabel}
              </Badge>
            </div>
            <Slider
              value={[priceValue]}
              onValueChange={(v) => setPriceValue(v[0] ?? 0)}
              min={0}
              max={15}
              step={1}
              aria-label="Maximum entry price"
              className={sliderClasses}
            />
            <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
              {PRICE_LABELS.map((l) => <span key={l}>{l}</span>)}
            </div>
          </CardContent>
        </Card>

        {/* Date */}
        <Card className="border-white/[0.06] bg-white/[0.02] rounded-xl">
          <CardContent className="p-4 space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Date</Label>
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((d) => {
                const selected = dateFilter === d.id;
                return (
                  <Button
                    key={d.id}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter(selected ? null : d.id)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl text-sm font-medium h-auto py-2.5 px-4",
                      selected
                        ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                        : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{d.emoji}</span>
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {isError && (
          <Card className="border-red-500/30 bg-red-500/10 rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <div className="flex-1">
                <p className="text-sm text-red-200">Failed to load party count</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="shrink-0 border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="absolute inset-x-0 bottom-[84px] z-30 mx-auto max-w-[480px] px-3">
        <Card className="rounded-2xl border-white/[0.06] bg-background/80 backdrop-blur-2xl shadow-[0_-6px_30px_-10px_rgba(0,0,0,0.5)]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearAll}
                  className="h-12 w-12 shrink-0 rounded-xl border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-white"
                  aria-label="Clear all filters"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={applyAndGo}
                disabled={isLoading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-500 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400 disabled:opacity-70"
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
              </Button>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearAll}
                className="mt-2 w-full text-[10px] text-muted-foreground/50 hover:text-muted-foreground h-auto py-1"
              >
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
