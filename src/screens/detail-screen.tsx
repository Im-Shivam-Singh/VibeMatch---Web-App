"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Share2,
  Heart,
  MessageCircle,
  ShieldCheck,
  Send,
  Check,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  formatDateLabel,
  formatFee,
  formatTime,
  parseVibes,
  pickGuestAvatars,
  slotsLeft,
} from "@/lib/types";
import { VibeBadge } from "@/components/vibe/vibe-badge";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { RatingPill } from "@/components/vibe/rating-pill";
import { GuestAvatars } from "@/components/vibe/guest-avatars";
import { LiveCountdown } from "@/components/vibe/live-countdown";
import { ReviewsSection } from "@/components/vibe/reviews-section";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DetailScreen() {
  const id = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);
  const setScreen = useAppStore((s) => s.setScreen);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [intro, setIntro] = useState("");
  const saved = useAppStore((s) =>
    id ? s.savedPartyIds.includes(id) : false,
  );
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["party", id],
    queryFn: () => api.getParty(id!),
    enabled: !!id,
  });

  // Record a view once per party detail mount (for host analytics)
  useEffect(() => {
    if (!id) return;
    api.recordView(id, currentUser?.id).catch(() => {
      /* non-blocking */
    });
  }, [id, currentUser?.id]);

  const requestMutation = useMutation({
    mutationFn: () =>
      api.sendRequest({
        partyId: id!,
        requesterName: currentUser?.name || "Guest",
        introMessage: intro,
      }),
    onSuccess: () => {
      toast.success("Request sent! 🚀", {
        description: "The host will get back to you shortly.",
      });
      setDrawerOpen(false);
      setIntro("");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const messageHost = async () => {
    if (!currentUser || !data?.host) {
      toast.error("Sign in to message the host");
      return;
    }
    try {
      const res = await api.ensureThread(
        currentUser.id,
        data.host.id,
        data.party.id,
      );
      setSelectedThreadId(res.threadId);
      setScreen("chat");
    } catch (e) {
      toast.error("Couldn't open chat");
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.party.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't load this party.
        </p>
        <Button variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  const { party, host, vibes } = data;
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const isFull = left === 0;
  const isLow = left > 0 && left <= 5;
  const isOwn = currentUser && host && currentUser.id === host.id;

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto pb-44">
        {/* Cover */}
        <div className="relative aspect-[16/11] w-full">
          {party.coverUrl ? (
            <img
              src={party.coverUrl}
              alt={party.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet/40 via-pink/30 to-cyan/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),12px)]">
            <button
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-full glass border border-white/10"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toggleSaved(id!);
                  toast.success(saved ? "Removed from saved" : "Saved!", {
                    duration: 1500,
                  });
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full glass border border-white/10"
                aria-label="Save"
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition",
                    saved && "fill-pink text-pink",
                  )}
                />
              </button>
              <button
                onClick={share}
                className="flex h-9 w-9 items-center justify-center rounded-full glass border border-white/10"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-4">
          {/* Title + vibes */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="flex-1 font-display text-2xl font-extrabold leading-tight">
                {party.title}
              </h1>
              <LiveCountdown
                date={party.date}
                time={party.time}
                size="md"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vibes.map((v) => (
                <VibeBadge key={v} vibe={v} size="md" />
              ))}
            </div>
          </section>

          {/* Who's going — social proof */}
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 p-3">
            <div className="flex min-w-0 items-center gap-3">
              {party.guestCount > 0 ? (
                <GuestAvatars
                  avatars={pickGuestAvatars(party.id, Math.min(5, party.guestCount))}
                  total={party.guestCount}
                  size={32}
                  max={4}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {party.guestCount} going
                  {!isFull && (
                    <span className="ml-1 text-muted-foreground">
                      · {left} slots left
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isFull
                    ? "Sold out — join the waitlist"
                    : isLow
                      ? "Almost full, grab your spot"
                      : "Spots open"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                isFull
                  ? "bg-rose-500/15 text-rose-200 border border-rose-400/30"
                  : isLow
                    ? "bg-amber-500/15 text-amber-200 border border-amber-400/30"
                    : "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
              )}
            >
              {isFull ? "Sold out" : `${left}/${party.maxGuests}`}
            </span>
          </section>

          {/* Quick facts */}
          <section className="grid grid-cols-2 gap-2">
            <Fact
              icon={<MapPin className="h-4 w-4 text-pink" />}
              label="Location"
              value={`${party.area}, ${party.city}`}
            />
            <Fact
              icon={<Calendar className="h-4 w-4 text-violet" />}
              label="Date"
              value={formatDateLabel(party.date)}
            />
            <Fact
              icon={<Clock className="h-4 w-4 text-cyan" />}
              label="Time"
              value={formatTime(party.time)}
            />
            <Fact
              icon={<IndianRupee className="h-4 w-4 text-pink" />}
              label="Entry"
              value={formatFee(party.fee)}
            />
          </section>

          {/* Host card */}
          {host && (
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={host.name} src={host.avatarUrl} size={56} ring />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-display text-base font-semibold">
                        {host.name}
                      </p>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-violet" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{host.username} · {host.hosted} hosted
                    </p>
                  </div>
                  <RatingPill rating={host.rating} count={host.ratingCount} />
                </div>
                {host.bio && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                    {host.bio}
                  </p>
                )}
              </div>
              <div className="flex gap-2 border-t border-border/60 p-3">
                <Button
                  size="sm"
                  className="flex-1 rounded-xl vibe-gradient-bg font-semibold"
                  onClick={messageHost}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Message host
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/60"
                  onClick={() =>
                    toast.info("Profile coming soon", {
                      description: `View ${host.name}'s full profile`,
                    })
                  }
                >
                  View profile
                </Button>
              </div>
            </section>
          )}

          {/* Description */}
          {party.description && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
                <Info className="h-4 w-4 text-violet" /> About this party
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {party.description}
              </p>
            </section>
          )}

          {/* House rules */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <h2 className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-violet" /> House rules
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Respect the host, the space, and the other guests.",
                "No means no. Harassment = instant removal + ban.",
                "ID may be checked at the door for age-restricted events.",
                "Bring good energy. Leave drama at home.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {/* Reviews */}
          {party.id && <ReviewsSection partyId={party.id} />}
        </div>
      </div>

      {/* Sticky CTA — sits above the bottom nav */}
      <div className="absolute inset-x-0 bottom-[84px] z-30 mx-auto max-w-[480px] px-3">
        <div className="glass flex items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 shadow-[0_-6px_30px_-10px_rgba(0,0,0,0.6)]">
          {isOwn ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Your party</p>
                <p className="text-sm font-semibold">
                  {party.guestCount}/{party.maxGuests} going
                </p>
              </div>
              <Button
                className="rounded-full vibe-gradient-bg"
                onClick={() => setScreen("requests")}
              >
                View requests
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[11px] text-muted-foreground">Entry</p>
                <p className="font-display text-lg font-bold">
                  {formatFee(party.fee)}
                </p>
              </div>
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button
                    disabled={isFull}
                    className="h-12 flex-[2] rounded-xl vibe-gradient-bg text-base font-semibold shadow-[0_10px_30px_-8px_rgba(236,72,153,0.7)] disabled:opacity-50"
                  >
                    {isFull ? "Sold out" : "Request to Connect ✉️"}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="mx-auto max-w-[480px] rounded-t-3xl border-border/60 bg-card/95 backdrop-blur-xl">
                  <DrawerHeader className="text-center">
                    <DrawerTitle className="font-display text-xl font-bold">
                      <span className="vibe-gradient-text">Request to Connect</span>
                    </DrawerTitle>
                    <DrawerDescription className="text-muted-foreground">
                      Write a short intro to {party.hostName}. They'll review and
                      get back to you.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-3 px-4">
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Tips
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>· Mention your vibe & who you're bringing</li>
                        <li>· Be friendly — hosts love good energy</li>
                        <li>· Keep it under 200 chars</li>
                      </ul>
                    </div>
                    <Textarea
                      autoFocus
                      rows={4}
                      maxLength={240}
                      placeholder="Hey! Loved the description. I'm coming with a +1, big into techno…"
                      value={intro}
                      onChange={(e) => setIntro(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-right text-[11px] text-muted-foreground">
                      {intro.length}/240
                    </p>
                  </div>
                  <DrawerFooter className="px-4 pb-6">
                    <Button
                      onClick={() => requestMutation.mutate()}
                      disabled={
                        requestMutation.isPending || intro.trim().length < 5
                      }
                      className="h-12 rounded-xl vibe-gradient-bg text-base font-semibold"
                    >
                      {requestMutation.isPending ? (
                        "Sending…"
                      ) : (
                        <>
                          <Send className="mr-1.5 h-4 w-4" /> Send Request 🚀
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
