"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Inbox as InboxIcon,
  Check,
  X,
  Clock,
  Video as VideoIcon,
  Sparkles,
} from "lucide-react";
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
  const qc = useQueryClient();

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

  const actMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      api.updateRequest(id, status),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.status === "accepted" ? "Request accepted ✅" : "Request rejected",
        {
          description:
            vars.status === "accepted"
              ? "A chat thread has been opened with this guest."
              : "The slot has been released.",
        },
      );
      qc.invalidateQueries({ queryKey: ["requests", activePartyId] });
      qc.invalidateQueries({ queryKey: ["parties"] });
      qc.invalidateQueries({ queryKey: ["analytics", currentUser?.id] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const allRequests = data?.requests ?? [];
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const requests = allRequests.filter((r) =>
    tab === "all" ? true : r.status === tab,
  );

  const act = (id: string, status: "accepted" | "rejected") => {
    actMutation.mutate({ id, status });
  };

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col">
      {/* ── Frosted header ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <motion.button
            onClick={goBack}
            whileTap={{ scale: 0.9 }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Requests
            </h1>
            {pendingCount > 0 && (
              <p className="text-[11px] font-medium text-amber-300/80">
                {pendingCount} pending
              </p>
            )}
          </div>

          {pendingCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 text-xs font-bold text-amber-300"
            >
              {pendingCount}
            </motion.span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3">
          {(["all", "pending", "accepted"] as const).map((t) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-colors",
                tab === t
                  ? "text-white"
                  : "text-white/40 hover:text-white/60",
              )}
            >
              {tab === t && (
                <motion.div
                  layoutId="request-tab"
                  className="absolute inset-0 rounded-xl bg-purple-500/20 border border-purple-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {t}
                {t === "pending" && pendingCount > 0 && (
                  <span className="ml-1 text-[10px]">({pendingCount})</span>
                )}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* No hosted parties */}
        {!activePartyId && (
          <EmptyState
            icon={InboxIcon}
            title="No hosted parties yet"
            description="Once you launch a vibe, join requests from guests will show up here."
            action={
              <motion.button
                onClick={() => setScreen("create")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
              >
                <Sparkles className="h-4 w-4" />
                Launch a vibe
              </motion.button>
            }
          />
        )}

        {/* Loading skeleton */}
        {activePartyId && isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded-lg bg-white/[0.06] animate-pulse" />
                    <div className="h-3 w-2/3 rounded-lg bg-white/[0.04] animate-pulse" />
                    <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty requests */}
        {activePartyId && !isLoading && requests.length === 0 && (
          <EmptyState
            icon={InboxIcon}
            title="No requests here"
            description="When guests send a Request to Connect, they'll appear in this list."
          />
        )}

        {/* Request list */}
        {activePartyId && !isLoading && requests.length > 0 && (
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {requests.map((r, i) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-sm",
                    r.status === "pending"
                      ? "border-amber-500/20"
                      : "border-white/[0.06]",
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <span
                          className={cn(
                            "block shrink-0 rounded-full ring-2",
                            r.status === "pending"
                              ? "ring-amber-400/40"
                              : r.status === "accepted"
                                ? "ring-teal-400/40"
                                : "ring-white/10",
                          )}
                        >
                          <UserAvatar name={r.requesterName} size={44} />
                        </span>
                        {r.status === "pending" && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-foreground">
                            {r.requesterName}
                          </p>
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground/60">
                            {relativeTime(r.createdAt)}
                          </span>
                        </div>

                        {/* Intro message */}
                        <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                          <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">
                            {r.introMessage}
                          </p>
                        </div>

                        {/* Intro video */}
                        {r.introVideoUrl && (
                          <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.06]">
                            <div className="flex items-center gap-2 bg-white/[0.03] px-3 py-2">
                              <VideoIcon className="h-3.5 w-3.5 text-purple-400" />
                              <span className="text-[11px] font-medium text-purple-300">
                                Intro video attached
                              </span>
                            </div>
                            <video
                              src={r.introVideoUrl}
                              poster={r.introVideoPoster ?? undefined}
                              controls
                              playsInline
                              className="h-32 w-full bg-black object-cover"
                            />
                          </div>
                        )}

                        {/* Action buttons or status */}
                        {r.status === "pending" ? (
                          <div className="mt-3 flex gap-2">
                            <motion.button
                              onClick={() => act(r.id, "accepted")}
                              whileTap={{ scale: 0.93 }}
                              disabled={actMutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 px-4 py-2 text-xs font-bold text-teal-200 transition-colors hover:bg-teal-500/25 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </motion.button>
                            <motion.button
                              onClick={() => act(r.id, "rejected")}
                              whileTap={{ scale: 0.93 }}
                              disabled={actMutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </motion.button>
                          </div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3"
                          >
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                                r.status === "accepted"
                                  ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                                  : "bg-white/5 text-white/30 border border-white/[0.06]",
                              )}
                            >
                              {r.status === "accepted" ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {r.status === "accepted" ? "Accepted · chat opened" : "Declined"}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
