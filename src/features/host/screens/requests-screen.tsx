"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Inbox as InboxIcon,
  Check,
  X,
  Clock,
  Video as VideoIcon,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { relativeTime } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RequestsScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"all" | "pending" | "accepted">("all");

  // Fetch the user's hosted parties, then their requests.
  const { data: myParties, isError: isPartiesError, refetch: refetchParties } = useQuery({
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

  const { data, isLoading, isError: isRequestsError, refetch: refetchRequests, error } = useQuery({
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

  const isError = isPartiesError || isRequestsError;
  const refetch = () => { refetchParties(); refetchRequests(); };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* ── Frosted header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            aria-label="Back"
            className="rounded-xl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

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
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/20 text-amber-300"
            >
              {pendingCount}
            </Badge>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3">
          {(["all", "pending", "accepted"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-xl capitalize text-xs font-semibold",
                tab === t
                  ? "bg-purple-500/20 border border-purple-500/30 text-white hover:bg-purple-500/25"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-1 text-[10px]">({pendingCount})</span>
              )}
            </Button>
          ))}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* No hosted parties */}
        {!activePartyId && !isPartiesError && (
          <EmptyState
            icon={InboxIcon}
            title="No hosted parties yet"
            description="Once you launch a vibe, join requests from guests will show up here."
            action={
              <Button
                onClick={() => setScreen("create")}
                className="rounded-2xl bg-purple-500 px-6 shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Launch a vibe
              </Button>
            }
          />
        )}

        {/* Error state */}
        {activePartyId && isError && (
          <Card className="border-coral/20 bg-coral/[0.04] py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 border border-coral/20">
                <RefreshCw className="h-5 w-5 text-coral" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Couldn&apos;t load requests
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "Something went wrong. Try again."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {activePartyId && isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="py-0 gap-0 border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3 rounded-lg" />
                      <Skeleton className="h-3 w-2/3 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty requests */}
        {activePartyId && !isLoading && !isError && requests.length === 0 && (
          <EmptyState
            icon={InboxIcon}
            title="No requests here"
            description="When guests send a Request to Connect, they'll appear in this list."
          />
        )}

        {/* Request list */}
        {activePartyId && !isLoading && !isError && requests.length > 0 && (
          <ul className="space-y-3">
            {requests.map((r, i) => (
              <li key={r.id}>
                <Card
                  className={cn(
                    "py-0 gap-0 backdrop-blur-sm",
                    r.status === "pending"
                      ? "border-amber-500/20"
                      : "border-border/40",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-11 w-11 ring-2",
                            r.status === "pending"
                              ? "ring-amber-400/40"
                              : r.status === "accepted"
                                ? "ring-teal-400/40"
                                : "ring-border",
                          )}
                        >
                          <AvatarFallback className="bg-purple-500/20 text-purple-200 text-sm font-bold">
                            {r.requesterName?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
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
                        <div className="mt-2 rounded-xl border border-border/40 bg-muted/50 px-3 py-2">
                          <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">
                            {r.introMessage}
                          </p>
                        </div>

                        {/* Intro video */}
                        {r.introVideoUrl && (
                          <div className="mt-2 overflow-hidden rounded-xl border border-border/40">
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  disabled={actMutation.isPending}
                                  className="gap-1.5 rounded-xl border-teal-500/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 hover:text-teal-100"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Accept
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Accept this request?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {r.requesterName} will be added as a confirmed guest and a chat thread will be opened.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => act(r.id, "accepted")}
                                    className="bg-teal-600 hover:bg-teal-500"
                                  >
                                    Accept
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  disabled={actMutation.isPending}
                                  className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Decline
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Decline this request?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {r.requesterName}&apos;s spot will be released. They can request again later.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => act(r.id, "rejected")}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Decline
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1.5 text-[11px] font-semibold",
                                r.status === "accepted"
                                  ? "border-teal-500/30 bg-teal-500/15 text-teal-300"
                                  : "border-border/40 bg-muted/50 text-muted-foreground",
                              )}
                            >
                              {r.status === "accepted" ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {r.status === "accepted" ? "Accepted · chat opened" : "Declined"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
