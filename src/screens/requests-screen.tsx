"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Inbox as InboxIcon, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { EmptyState } from "@/components/vibe/empty-state";
import { relativeTime } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RequestsScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  const [tab, setTab] = useState<"all" | "pending" | "accepted">("all");

  // Fetch the user's hosted parties, then their requests.
  const { data: myParties } = useQuery({
    queryKey: ["parties", "mine", currentUser?.name],
    queryFn: () =>
      api.listParties().then((res) => ({
        ...res,
        parties: res.parties.filter(
          (p) =>
            p.hostName === currentUser?.name ||
            p.hostId === currentUser?.id,
        ),
      })),
    enabled: !!currentUser,
  });

  const partyIds = (myParties?.parties ?? []).map((p) => p.id);
  const activePartyId = partyIds[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["requests", activePartyId],
    queryFn: () => api.listRequests(activePartyId!),
    enabled: !!activePartyId,
    refetchInterval: 12_000,
  });

  const requests = (data?.requests ?? []).filter((r) =>
    tab === "all" ? true : r.status === tab,
  );

  const act = (id: string, status: "accepted" | "rejected") => {
    toast.success(
      status === "accepted" ? "Request accepted ✅" : "Request rejected",
      {
        description:
          status === "accepted"
            ? "A chat thread has been opened with this guest."
            : undefined,
      },
    );
    refetch();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 glass border-b border-border/60 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 font-display text-lg font-bold">
            Join requests
          </h1>
        </div>
        {/* Tabs */}
        <div className="mt-3 flex gap-1 rounded-full border border-border/60 bg-card/40 p-1">
          {(["all", "pending", "accepted"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition",
                tab === t
                  ? "vibe-gradient-bg text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4">
        {!activePartyId && (
          <EmptyState
            icon={InboxIcon}
            title="No hosted parties yet"
            description="Once you launch a vibe, join requests from guests will show up here."
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

        {activePartyId && isLoading && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3"
              >
                <div className="h-10 w-10 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-white/5" />
                  <div className="h-2 w-2/3 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activePartyId && !isLoading && requests.length === 0 && (
          <EmptyState
            icon={InboxIcon}
            title="No requests here"
            description="When guests send a Request to Connect, they'll appear in this list."
          />
        )}

        {activePartyId && !isLoading && requests.length > 0 && (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border/60 bg-card/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar name={r.requesterName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {r.requesterName}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">
                      {r.introMessage}
                    </p>
                    {r.status === "pending" ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => act(r.id, "accepted")}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => act(r.id, "rejected")}
                          className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          r.status === "accepted"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300",
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
