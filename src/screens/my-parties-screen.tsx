"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Flame, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PartyCard } from "@/components/vibe/party-card";
import { EmptyState } from "@/components/vibe/empty-state";
import { HostAnalytics as HostAnalyticsCard } from "@/components/vibe/host-analytics";
import { Skeleton } from "@/components/ui/skeleton";

export function MyPartiesScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const openCreate = useAppStore((s) => s.openCreate);

  const { data, isLoading } = useQuery({
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

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 glass border-b border-border/60 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold">My parties</h1>
      </header>

      <div className="fancy-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
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
                className="overflow-hidden rounded-3xl border border-border bg-card/60"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
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
                className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
              >
                Launch a vibe
              </button>
            }
          />
        )}

        {!isLoading && parties.length > 0 && (
          <>
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> {parties.length} parties hosted
            </div>
            {parties.map((p) => (
              <PartyCard
                key={p.id}
                party={p}
                onOpen={(id) => {
                  setSelectedPartyId(id);
                  setScreen("detail");
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
