"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Heart, Search, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PartyCard } from "@/components/party/party-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export function SavedScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const savedPartyIds = useAppStore((s) => s.savedPartyIds);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", "all"],
    queryFn: () => api.listParties(),
  });

  const saved = useMemo(() => {
    const all = data?.parties ?? [];
    return all.filter((p) => savedPartyIds.includes(p.id));
  }, [data, savedPartyIds]);

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* ── Frosted header ─────────────────────────────────────────── */}
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

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Saved
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {saved.length} {saved.length === 1 ? "party" : "parties"} saved
            </p>
          </div>

          <Badge variant="outline" className="h-10 w-10 p-0 items-center justify-center rounded-xl bg-purple-500/10 border-purple-500/20">
            <Heart className="h-4.5 w-4.5 fill-purple-400 text-purple-400" />
          </Badge>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden rounded-2xl border-white/[0.06] bg-white/[0.03]">
                <Skeleton className="aspect-[16/10] w-full rounded-none bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-transparent" />
                <CardContent className="space-y-2.5 p-4">
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state with retry */}
        {isError && !isLoading && (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load saved parties"
            description="Something went wrong fetching your saved parties. Please try again."
            action={
              <Button
                onClick={() => refetch()}
                className="gap-2 rounded-2xl bg-purple-500 px-6 text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            }
          />
        )}

        {/* Empty state */}
        {!isLoading && !isError && saved.length === 0 && (
          <EmptyState
            icon={Heart}
            title="No saved parties yet"
            description="Tap the heart on any party to save it here for later. Your favourites will be waiting."
            action={
              <Button
                onClick={() => setScreen("home")}
                className="gap-2 rounded-2xl bg-purple-500 px-6 text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
              >
                <Search className="h-4 w-4" />
                Explore parties
              </Button>
            }
          />
        )}

        {/* Saved party grid */}
        {!isLoading && !isError && saved.length > 0 && (
          <div className="space-y-4">
            {saved.map((p, i) => (
              <div key={p.id}>
                <PartyCard party={p} onOpen={openParty} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
