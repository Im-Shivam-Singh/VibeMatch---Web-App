"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Heart, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PartyCard } from "@/components/party/party-card";
import { cn } from "@/lib/utils";

export function SavedScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const savedPartyIds = useAppStore((s) => s.savedPartyIds);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading } = useQuery({
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
              Saved
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {saved.length} {saved.length === 1 ? "party" : "parties"} saved
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Heart className="h-4.5 w-4.5 fill-purple-400 text-purple-400" />
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* Loading shimmer */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}



                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-transparent animate-pulse" />
                <div className="space-y-2.5 p-4">
                  <div className="h-4 w-3/4 rounded-lg bg-white/[0.06] animate-pulse" />
                  <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state with heart animation */}
        {!isLoading && saved.length === 0 && (
          <div



            className="flex flex-col items-center justify-center gap-6 px-6 py-20 text-center"
          >
            {/* Animated heart illustration */}
            <div className="relative">
              <div


                className="flex h-24 w-24 items-center justify-center rounded-3xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_40px_-8px_rgba(83,74,183,0.3)]"
              >
                <Heart className="h-10 w-10 text-purple-400 fill-purple-400/60" />
              </div>
              {/* Floating sparkles */}
              <div


                className="absolute -top-2 -right-2 text-lg"
              >
                ✨
              </div>
              <div


                className="absolute -bottom-1 -left-3 text-sm"
              >
                💜
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-foreground">
                No saved parties yet
              </h3>
              <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                Tap the heart on any party to save it here for later. Your
                favourites will be waiting.
              </p>
            </div>

            <button
              onClick={() => setScreen("home")}


              className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] transition-colors hover:bg-purple-400"
            >
              <Search className="h-4 w-4" />
              Explore parties
            </button>
          </div>
        )}

        {/* Saved party grid */}
        {!isLoading && saved.length > 0 && (
          <div className="space-y-4">
              {saved.map((p, i) => (
                <div
                  key={p.id}




                >
                  <PartyCard party={p} onOpen={openParty} index={i} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
