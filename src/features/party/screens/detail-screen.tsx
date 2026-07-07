"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Share2,
  Heart,
  MessageCircle,
  ShieldCheck,
  Lock,
  Play,
  UploadCloud,
  Video as VideoIcon,
  Loader2,
  Send,
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Edit3,
  BarChart3,
  MessageSquare,
  Plus,
  ExternalLink,
  Music,
  Archive,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  formatFee,
  formatTime,
  parseVibes,
  slotsLeft,
  VIBE_COLORS,
  VIBE_EMOJI,
  partyLiveStatus,
  countdownTo,
  pickGuestAvatars,
  type PartyMedia,
  type MenuItem,
} from "@/lib/types";
import { ReviewsSection } from "@/components/party/reviews-section";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn, formatLocation } from "@/lib/utils";

// ── Vibe → hero gradient mapping ──────────────────────────────────
const VIBE_HERO_GRADIENT: Record<string, [string, string]> = {
  "R&B": ["#2d1b69", "#1a0a3e"],
  Bollywood: ["#1a4a2e", "#0d2a18"],
  Games: ["#0d3a4a", "#0a1f2d"],
  "Lo-fi": ["#2d1b69", "#1a0a3e"],
  Chill: ["#0d3a4a", "#0a2a3a"],
  EDM: ["#4a1b69", "#1a0a4e"],
  Retro: ["#3d1b3a", "#1a0a2d"],
};

// Guest avatar colors for the "Who's going" stack
const GUEST_COLORS = [
  "bg-purple-500/40 text-purple-200",
  "bg-teal-500/35 text-teal-200",
  "bg-amber-500/35 text-amber-200",
  "bg-rose-500/35 text-rose-200",
  "bg-cyan-500/35 text-cyan-200",
];

// Menu category config
const MENU_CATEGORIES = [
  { key: "drink", label: "Drinks", emoji: "🍹" },
  { key: "snack", label: "Snacks", emoji: "🍿" },
  { key: "soft", label: "Soft", emoji: "🥤" },
] as const;

// ── Main Component ────────────────────────────────────────────────
export function DetailScreen() {
  const id = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);
  const setScreen = useAppStore((s) => s.setScreen);
  const saved = useAppStore((s) =>
    id ? s.savedPartyIds.includes(id) : false,
  );
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const qc = useQueryClient();

  // ── Spot sheet state ────────────────────────────────────────────
  const [spotSheetOpen, setSpotSheetOpen] = useState(false);
  const [intro, setIntro] = useState("");
  const [introVideo, setIntroVideo] = useState<{
    url: string;
    poster?: string;
    name: string;
  } | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const introFileRef = useRef<HTMLInputElement>(null);

  // ── Confirm dialog for join request ─────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Description expand ──────────────────────────────────────────
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Menu category filter ────────────────────────────────────────
  const [menuCategory, setMenuCategory] = useState<string>("drink");

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Queries ─────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["party", id],
    queryFn: () => api.getParty(id!),
    enabled: !!id,
    retry: 2,
  });

  const { data: menuData } = useQuery({
    queryKey: ["menu", id],
    queryFn: () => api.listMenu(id!),
    enabled: !!id,
  });

  // Check if user is already in this party (accepted request or has ticket)
  const { data: userPartyStatus } = useQuery({
    queryKey: ["user-party-status", currentUser?.id, id],
    queryFn: () => api.getUserPartyStatus(currentUser!.id, id!),
    enabled: !!currentUser?.id && !!id && !isLoading,
  });

  // Record view
  useEffect(() => {
    if (!id) return;
    api.recordView(id, currentUser?.id).catch(() => {});
  }, [id, currentUser?.id]);

  // ── Message host ────────────────────────────────────────────────
  const messageHost = useCallback(async () => {
    if (!currentUser) {
      toast.error("Sign in to message the host");
      return;
    }
    if (!data?.host?.id) {
      toast.error("Host profile unavailable", {
        description: "This host's profile couldn't be found. Try again later.",
      });
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
    } catch {
      toast.error("Couldn't open chat");
    }
  }, [currentUser, data, setSelectedThreadId, setScreen]);

  // ── Share ───────────────────────────────────────────────────────
  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.party.title ?? "Party", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {}
  }, [data]);

  // ── Intro video upload ──────────────────────────────────────────
  const handleIntroVideoPick = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const file = fileList[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please pick a video file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File must be under 5 MB", {
          description: "Compress your video and try again",
        });
        return;
      }
      setUploadPct(0);
      api
        .uploadMedia([file], (pct) => setUploadPct(pct))
        .then((res) => {
          const f = res.files[0];
          if (!f) return;
          setIntroVideo({
            url: f.url,
            poster: URL.createObjectURL(file),
            name: file.name,
          });
          toast.success("Intro video attached");
        })
        .catch((e: Error) =>
          toast.error(e instanceof Error ? e.message : "Upload failed"),
        )
        .finally(() => setUploadPct(null));
      if (introFileRef.current) introFileRef.current.value = "";
    },
    [],
  );

  // ── Submit spot request ─────────────────────────────────────────
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Please sign in first");

      let threadId: string | undefined;
      if (data?.host?.id) {
        const threadRes = await api.ensureThread(
          currentUser.id,
          data.host.id,
          data.party.id,
        );
        threadId = threadRes.threadId;
      }

      const res = await api.sendRequest({
        partyId: data.party.id,
        requesterName: currentUser.name,
        introMessage: intro.trim(),
        requesterId: currentUser.id,
        threadId,
        introVideoUrl: introVideo?.url,
        introVideoPoster: introVideo?.poster,
      });
      return { threadId: res.threadId ?? threadId ?? null, code: res.code };
    },
    onSuccess: ({ threadId, code }) => {
      if (code === "HOST_NOT_LINKED") {
        toast.success("Intro recorded! 🎬", {
          description: "The host will see your request once their profile is available.",
        });
      } else {
        toast.success("Intro sent to the host! 🎬", {
          description: "Payment unlocks here once they approve.",
        });
      }
      setSpotSheetOpen(false);
      setConfirmOpen(false);
      setIntro("");
      setIntroVideo(null);
      qc.invalidateQueries({ queryKey: ["parties"] });
      qc.invalidateQueries({ queryKey: ["threads", currentUser?.id] });
      if (threadId) {
        setSelectedThreadId(threadId);
        setScreen("chat");
      }
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (msg.includes("declined")) {
        toast.error("Can't re-apply yet", {
          description:
            "You were declined for this event. Try again after it's over.",
        });
      } else if (msg.includes("HOST_NOT_FOUND") || msg.includes("host profile") || msg.includes("Host profile")) {
        toast.error("Host profile unavailable", {
          description:
            "This host's profile couldn't be found. The party may be missing a host account.",
        });
      } else if (msg.includes("queue") || msg.includes("Queue")) {
        toast.error("Queue is full", {
          description:
            "This event has too many pending applications. Try later.",
        });
      } else if (msg.includes("pending") || msg.includes("Pending")) {
        toast.info("You already have a pending request", {
          description: "Opening your chat with the host…",
        });
        if (data?.host?.id && currentUser) {
          api
            .ensureThread(currentUser.id, data.host.id!, data.party.id)
            .then((r) => {
              setSelectedThreadId(r.threadId);
              setScreen("chat");
              setSpotSheetOpen(false);
              setConfirmOpen(false);
            })
            .catch(() => {});
        }
      } else {
        toast.error(msg || "Couldn't send request");
      }
    },
  });

  // ── No party ID — show error ────────────────────────────────────
  if (!id) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center p-6">
        <Card className="border-white/[0.06] bg-card/60 backdrop-blur-xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)] gap-0 py-0 max-w-sm w-full">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/[0.08] shadow-[0_0_24px_-6px_rgba(83,74,183,0.25)]">
              <AlertTriangle className="h-9 w-9 text-purple-400" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Party not found
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              This party may have been removed or the link is invalid.
            </p>
            <Button variant="outline" onClick={goBack} className="rounded-2xl">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center p-6">
        <Card className="border-white/[0.06] bg-card/60 backdrop-blur-xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)] gap-0 py-0 max-w-sm w-full">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] shadow-[0_0_24px_-6px_rgba(239,68,68,0.25)]">
              <AlertTriangle className="h-9 w-9 text-rose-400" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Couldn&apos;t load this party
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong. Please try again."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="rounded-2xl"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
              <Button variant="secondary" onClick={goBack} className="rounded-2xl">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Go back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { party, host, vibes } = data;
  const firstVibe = vibes[0] || parseVibes(party.vibes)[0] || "Chill";
  const heroGradient = VIBE_HERO_GRADIENT[firstVibe] || ["#2d1b69", "#1a0a3e"];
  const heroEmoji = VIBE_EMOJI[firstVibe] || "✨";
  const currency = currencyForCity(party.city);
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const going = party.guestCount;
  const isFull = left === 0;
  const isLow = left > 0 && left <= 2;
  const isOwn = !!currentUser && !!host?.id && currentUser.id === host.id;
  const liveStatus = partyLiveStatus(party.date, party.time);
  const countdown = countdownTo(party.date, party.time);

  // Gallery — if media was cleaned, show a placeholder instead
  const isMediaCleaned = party.mediaCleaned === true;
  const gallery: PartyMedia[] = (() => {
    if (isMediaCleaned) return [];
    if (party.media && party.media.length > 0) return party.media;
    if (party.coverUrl) {
      return [
        {
          id: "cover",
          partyId: party.id,
          url: party.coverUrl,
          type: "image",
          caption: "",
          position: 0,
          createdAt: party.createdAt,
        },
      ];
    }
    return [];
  })();
  const hasGallery = gallery.length > 0;

  // End time
  const [hStr, mStr] = party.time.split(":");
  const startH = parseInt(hStr, 10) || 0;
  const startM = parseInt(mStr, 10) || 0;
  const endTotalMin = startH * 60 + startM + 4 * 60;
  const endH = Math.floor(endTotalMin / 60) % 24;
  const endM = endTotalMin % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  const feeLabel = formatFee(party.fee, party.city);

  // Menu items grouped by category
  const allMenuItems = menuData?.items ?? [];
  const filteredMenu =
    allMenuItems.length > 0
      ? allMenuItems.filter((i) => i.category === menuCategory)
      : [];
  const hasMenu = allMenuItems.length > 0;

  // Guest avatars
  const guestAvatars = pickGuestAvatars(party.id, Math.min(going, 5));

  const handleJoin = () => {
    if (!currentUser) {
      toast.error("Sign in to get your spot");
      return;
    }
    if (isFull) {
      toast.info("Sold out — join the waitlist", {
        description:
          "Send your intro — if a spot opens, the host can approve you.",
      });
    }
    setSpotSheetOpen(true);
  };

  const handleSaveToggle = () => {
    toggleSaved(id!);
    toast.success(saved ? "Removed from saved" : "Saved!", {
      duration: 1500,
    });
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="pb-28 lg:pb-20"
        >
          {/* ── HERO WITH PARALLAX ──────────────────────────────────── */}
          <div className="relative h-[340px] w-full max-w-full overflow-hidden">
            <div className="absolute inset-0">
              {hasGallery ? (
                <HeroGallery gallery={gallery} coverUrl={party.coverUrl ?? null} />
              ) : isMediaCleaned ? (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Card className="rounded-2xl border-white/10 bg-black/40 backdrop-blur-sm max-w-[260px] gap-0 py-0">
                      <CardContent className="p-6 text-center">
                        <Archive className="h-8 w-8 mx-auto text-white/50 mb-2" />
                        <p className="text-sm font-medium text-white/80">Media Cleaned</p>
                        <p className="text-xs text-white/50 mt-1">
                          {party.cleanedMessage || "Media files removed after 1 week post-event for storage optimization."}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl">
                      {heroEmoji}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Gradient overlay for text readability */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent" />

            {/* ── Floating glass buttons ──────────────────────────────── */}
            <div className="absolute left-4 top-[max(env(safe-area-inset-top),16px)] z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/20"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            <div className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={share}
                className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/20"
                aria-label="Share"
              >
                <Share2 className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveToggle}
                className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/20"
                aria-label={saved ? "Unsave" : "Save"}
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    saved ? "fill-coral text-coral" : "text-white",
                  )}
                />
              </Button>
            </div>

            {/* ── Live / Starting Soon badge ──────────────────────────── */}
            {(liveStatus === "live" || liveStatus === "starting-soon") && (
              <div className="absolute left-4 bottom-6 z-20">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur-sm",
                    liveStatus === "live"
                      ? "bg-coral/20 border-coral/50 text-coral vibe-live-ring"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-300",
                  )}
                >
                  {liveStatus === "live" ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
                    </span>
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {countdown}
                </Badge>
              </div>
            )}
          </div>

          {/* ── CONTENT ────────────────────────────────────────────────── */}
          <div className="relative z-10 -mt-8 space-y-6 px-4 lg:px-6 max-w-4xl mx-auto">
            {/* Quick Info Bar */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <QuickInfoPill
                icon={<Calendar className="h-3.5 w-3.5" />}
                text={formatDateLabel(party.date)}
              />
              <QuickInfoPill
                icon={<Clock className="h-3.5 w-3.5" />}
                text={formatTime(party.time)}
              />
              <QuickInfoPill
                icon={<MapPin className="h-3.5 w-3.5" />}
                text={formatLocation(party.area, party.city)}
                tappable={!!userPartyStatus?.isInParty && !!party.lat && !!party.lng}
                onClick={() => {
                  if (userPartyStatus?.isInParty && party.lat && party.lng) {
                    window.open(
                      `https://www.google.com/maps?q=${party.lat},${party.lng}`,
                      "_blank",
                    );
                  }
                }}
              />
              <QuickInfoPill
                icon={<span className="text-sm font-bold">{currency}</span>}
                text={party.fee > 0 ? String(party.fee) : "Free"}
                highlight
              />
            </div>

            {/* Title & Host Section */}
            <Card className="border-white/[0.06] bg-card/40 backdrop-blur-xl shadow-none gap-0 py-0 rounded-2xl">
              <CardContent className="p-4 lg:p-6 space-y-4">
                <h1 className="font-display text-2xl font-extrabold leading-tight text-foreground lg:text-3xl break-words">
                  {party.title}
                </h1>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-amber-400">
                    <AvatarImage
                      src={host?.avatarUrl ?? undefined}
                      alt={host?.name ?? party.hostName ?? "Host"}
                    />
                    <AvatarFallback className="bg-purple-500/20 text-purple-200 text-xs font-bold">
                      {(host?.name ?? party.hostName ?? "H").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {host?.name ?? party.hostName ?? "Unknown Host"}
                      </span>
                      {host?.id && (
                        <Badge
                          variant="outline"
                          className="gap-0.5 rounded-full bg-teal-500/15 border-teal-500/30 px-1.5 py-0 text-[10px] font-bold text-teal-300"
                        >
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                    {host?.id ? (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-purple-400 hover:text-purple-300"
                      >
                        View host profile →
                      </Button>
                    ) : (
                      <span className="text-xs text-white/40">Host profile unavailable</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vibe Tags */}
            <section>
              <div className="flex flex-wrap gap-2 pb-1">
                {vibes.map((v) => {
                  const cls = VIBE_COLORS[v] || "bg-purple-500/15 text-purple-300 border-purple-500/45";
                  return (
                    <Badge
                      key={v}
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                        cls,
                      )}
                    >
                      <span className="text-sm">{VIBE_EMOJI[v] || "✨"}</span>
                      {v}
                    </Badge>
                  );
                })}
              </div>
            </section>

            <Separator className="bg-gradient-to-r from-transparent via-purple-500/20 to-transparent h-px" />

            {/* Location Card */}
            <Card className="border-border/50 bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Location
                </h3>
                {userPartyStatus?.isInParty ? (
                  // Exact location for party members
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15">
                        <MapPin className="h-4 w-4 text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {formatLocation(party.area, party.city)} — exact address shown
                        </p>
                      </div>
                    </div>
                    {party.lat && party.lng && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps?q=${party.lat},${party.lng}`,
                            "_blank",
                          )
                        }
                        className="w-full rounded-xl border-teal-500/30 bg-teal-500/5 text-sm font-semibold text-teal-300 hover:bg-teal-500/10 hover:text-teal-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                        Open in Maps
                      </Button>
                    )}
                  </div>
                ) : (
                  // Vague area for non-members
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15">
                        <MapPin className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {formatLocation(party.area, party.city)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Exact location revealed after payment
                        </p>
                      </div>
                    </div>
                    {/* Vague highlighted area indicator */}
                    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-white/10 bg-card/30">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute -inset-6 rounded-full bg-purple-500/10 animate-pulse" />
                          <div className="absolute -inset-3 rounded-full bg-purple-500/15" />
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 ring-2 ring-purple-500/30">
                            <MapPin className="h-5 w-5 text-purple-300" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <Badge
                          variant="outline"
                          className="gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm border-transparent"
                        >
                          <Lock className="h-2.5 w-2.5" /> Exact pin shown after payment
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description (expandable) */}
            {party.description && (
              <Card className="border-white/[0.06] bg-card/40 backdrop-blur-xl shadow-none gap-0 py-0 rounded-2xl">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    About this party
                  </h3>
                  <div className="relative overflow-hidden">
                    <div
                      className={cn(
                        "whitespace-pre-line text-sm leading-relaxed text-foreground/80 break-words",
                        !descExpanded && party.description.length > 120 && "max-h-24",
                      )}
                    >
                      {party.description}
                    </div>
                    {!descExpanded && party.description.length > 120 && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card/40 to-transparent" />
                    )}
                  </div>
                  {party.description.length > 120 && (
                    <Button
                      variant="link"
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="h-auto p-0 text-xs font-semibold text-purple-400 hover:text-purple-300"
                    >
                      {descExpanded ? "Show less" : "Read more"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Who's Going */}
            <Card className="border-border/50 bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Who&apos;s going
                  </h3>
                  {going > 0 && (
                    <Badge variant="secondary" className="text-xs font-semibold text-purple-300 bg-purple-500/10 border-transparent">
                      {going} {going === 1 ? "person" : "people"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {going === 0 ? (
                      <Avatar className="h-9 w-9 border-2 border-dashed border-border/60">
                        <AvatarFallback className="bg-muted/30 text-xs text-muted-foreground">
                          ?
                        </AvatarFallback>
                      </Avatar>
                    ) : userPartyStatus?.isInParty ? (
                      // Real avatars for party members
                      guestAvatars.map((src, i) => (
                        <Avatar
                          key={i}
                          className={cn(
                            "h-9 w-9 border-2 border-background text-xs font-bold overflow-hidden",
                            GUEST_COLORS[i % GUEST_COLORS.length],
                          )}
                          style={{
                            marginLeft: i === 0 ? 0 : -8,
                            zIndex: guestAvatars.length - i,
                          }}
                        >
                          <AvatarImage src={src} alt="" />
                          <AvatarFallback className={GUEST_COLORS[i % GUEST_COLORS.length]}>
                            <Users className="h-4 w-4 opacity-60" />
                          </AvatarFallback>
                        </Avatar>
                      ))
                    ) : (
                      // Masked silhouettes for non-members
                      Array.from({ length: Math.min(going, 5) }).map((_, i) => (
                        <Avatar
                          key={i}
                          className={cn(
                            "h-9 w-9 border-2 border-background",
                            GUEST_COLORS[i % GUEST_COLORS.length],
                          )}
                          style={{
                            marginLeft: i === 0 ? 0 : -8,
                            zIndex: Math.min(going, 5) - i,
                          }}
                        >
                          <AvatarFallback className={GUEST_COLORS[i % GUEST_COLORS.length]}>
                            <Users className="h-4 w-4 opacity-60" />
                          </AvatarFallback>
                        </Avatar>
                      ))
                    )}
                    {going > 5 && (
                      <Avatar
                        className="h-9 w-9 border-2 border-background bg-white/5"
                        style={{ marginLeft: -8 }}
                      >
                        <AvatarFallback className="bg-white/5 text-[10px] font-bold text-muted-foreground">
                          +{going - 5}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="flex-1">
                    {going > 0 ? (
                      <p className="text-sm text-foreground/80">
                        <span className="font-semibold text-foreground">
                          Join {going} others
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Be the first to join
                      </p>
                    )}
                  </div>
                  {userPartyStatus?.isInParty && (
                    <Button variant="link" className="text-xs text-purple-400 hover:text-purple-300 font-medium h-auto p-0">
                      See all
                    </Button>
                  )}
                </div>
                {userPartyStatus?.isInParty ? (
                  <p className="flex items-center gap-1 text-[11px] text-teal-400">
                    <CheckCircle2 className="h-3 w-3" /> You can see full names
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Full names visible after payment
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Security badge */}
            {party.securityBooked && (
              <Card className="border-teal-500/25 bg-teal-500/5 shadow-none gap-0 py-0 rounded-2xl">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                    <ShieldCheck className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Verified security on-site
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Host has booked a licensed security person. Go worry-free.
                    </p>
                  </div>
                  <Badge className="shrink-0 rounded-full bg-teal-500/15 border-transparent text-[10px] font-bold text-teal-300">
                    🔒 Safe
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Menu Section */}
            {hasMenu && (
              <Card className="border-white/[0.06] bg-card/40 backdrop-blur-xl shadow-none gap-0 py-0 rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Menu
                  </h3>
                  {/* Category tabs using shadcn Tabs */}
                  <Tabs value={menuCategory} onValueChange={setMenuCategory}>
                    <TabsList className="bg-muted/30 h-auto p-1 rounded-full">
                      {MENU_CATEGORIES.map((cat) => {
                        const count = allMenuItems.filter(
                          (i) => i.category === cat.key,
                        ).length;
                        if (count === 0) return null;
                        return (
                          <TabsTrigger
                            key={cat.key}
                            value={cat.key}
                            className="rounded-full px-3 py-1.5 text-xs font-semibold gap-1.5 data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-200 data-[state=active]:border-purple-500/50 data-[state=active]:border"
                          >
                            <span>{cat.emoji}</span>
                            {cat.label}
                            <Badge
                              variant="secondary"
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-bold h-auto border-transparent",
                                menuCategory === cat.key
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-muted/30 text-muted-foreground",
                              )}
                            >
                              {count}
                            </Badge>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                  {/* Menu cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredMenu.map((item) => (
                      <div key={item.id} className="min-w-0">
                        <MenuCard
                          item={item}
                          currency={currency}
                        />
                      </div>
                    ))}
                  </div>
                  {filteredMenu.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items in this category
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {party.id && (
              <section>
                <ReviewsSection partyId={party.id} isInParty={userPartyStatus?.isInParty} />
              </section>
            )}

            {/* Spotify Playlist Embed */}
            {party.spotifyPlaylistUrl && (
              <SpotifyPlaylistEmbed spotifyPlaylistUrl={party.spotifyPlaylistUrl} />
            )}

            {/* Host controls (if user is host) */}
            {isOwn && (
              <Card className="border-white/[0.06] bg-card/40 backdrop-blur-xl shadow-none gap-0 py-0 rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Host controls
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <HostControlButton
                      icon={<Edit3 className="h-4 w-4" />}
                      label="Edit party"
                      onClick={() => setScreen("manage-party")}
                    />
                    <HostControlButton
                      icon={<Users className="h-4 w-4" />}
                      label="Manage requests"
                      badge={data.requests?.filter((r: any) => r.status === "pending").length}
                      onClick={() => setScreen("requests")}
                    />
                    <HostControlButton
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Group chat"
                      onClick={() => setScreen("group-chat")}
                    />
                    <HostControlButton
                      icon={<BarChart3 className="h-4 w-4" />}
                      label="Analytics"
                      onClick={() => setScreen("host-dashboard")}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bottom spacer for CTA */}
            <div className="h-24" />
          </div>
        </div>
      </ScrollArea>

      {/* ── INLINE CTA BAR ──────────────────────────────────────────── */}
      <div className="px-4 pb-6 lg:px-6 max-w-4xl mx-auto">
        <Card className="border-white/10 bg-background/70 backdrop-blur-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] gap-0 py-0 rounded-2xl">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            {/* Save heart */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleSaveToggle}
              className={cn(
                "h-12 w-12 shrink-0 rounded-xl transition",
                saved
                  ? "border-coral/40 bg-coral/10 text-coral hover:bg-coral/20"
                  : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground",
              )}
              aria-label={saved ? "Unsave" : "Save"}
            >
              <Heart className={cn("h-5 w-5", saved && "fill-coral")} />
            </Button>

            {/* Primary CTA */}
            {isOwn ? (
              <Button
                onClick={() => setScreen("manage-party")}
                className="h-12 flex-1 rounded-xl font-bold"
              >
                Manage your party
              </Button>
            ) : userPartyStatus?.isInParty ? (
              <Button
                onClick={() => setScreen("tickets")}
                className="h-12 flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {userPartyStatus.hasTicket ? "View Ticket" : "You're in!"}
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={false}
                className={cn(
                  "relative h-12 flex-1 rounded-xl font-bold transition overflow-hidden",
                  isFull
                    ? "bg-white/5 text-muted-foreground hover:bg-white/10"
                    : "bg-gradient-to-r from-purple-600 via-purple-500 to-violet-500 text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_4px_24px_-4px_rgba(139,92,246,0.6)]",
                )}
              >
                {/* Shimmer effect */}
                {!isFull && (
                  <span className="absolute inset-0 overflow-hidden rounded-xl">
                    <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </span>
                )}
                <span className="relative flex items-center gap-2">
                  {isFull ? (
                    "Sold out — join waitlist"
                  ) : (
                    <>
                      Request to Join
                      <span className="opacity-60">·</span>
                      <span>{feeLabel}</span>
                    </>
                  )}
                </span>
              </Button>
            )}

            {/* Spots indicator */}
            {!isFull && left > 0 && (
              <div className="flex shrink-0 flex-col items-end justify-center pr-1">
                <span className="text-[10px] font-bold text-teal-400">
                  {left} left
                </span>
                {party.approvalRequired && (
                  <Badge
                    variant="outline"
                    className="text-[9px] text-amber-400 border-transparent bg-transparent px-0 py-0 h-auto"
                  >
                    Approval
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── "Get your spot" sheet ────────────────────────────────────── */}
      <Sheet open={spotSheetOpen} onOpenChange={setSpotSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto rounded-t-3xl border-white/10 glass-strong p-0 lg:max-w-lg"
        >
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="font-display text-lg text-foreground">
              Get your spot at{" "}
              <span className="text-purple-400">{party.title}</span>
            </SheetTitle>
            <SheetDescription className="text-[12px] leading-relaxed text-muted-foreground">
              Write a quick intro + attach a short intro video. The host
              reviews it here in chat — payment unlocks the moment they say
              yes. No payment until approved.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 px-5 pb-5 pt-1">
              {/* Intro text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Your intro
                </label>
                <Textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  rows={3}
                  placeholder="Hey! I'm a big techno fan, bringing 2 friends, will arrive by 10…"
                  className="rounded-xl border-white/10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
                  maxLength={300}
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {intro.length}/300
                </p>
              </div>

              {/* Intro video */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Intro video{" "}
                  <span className="text-muted-foreground">(optional · ≤5 MB)</span>
                </label>
                <input
                  ref={introFileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/ogg"
                  className="hidden"
                  onChange={(e) => handleIntroVideoPick(e.target.files)}
                />
                {introVideo ? (
                  <div className="relative overflow-hidden rounded-xl border border-purple-400/40">
                    <video
                      src={introVideo.url}
                      poster={introVideo.poster}
                      controls
                      className="h-40 w-full bg-black object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setIntroVideo(null)}
                      aria-label="Remove intro video"
                      className="absolute right-2 top-2 h-7 w-7 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {introVideo.name.slice(0, 24)}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => introFileRef.current?.click()}
                    disabled={uploadPct !== null}
                    className="w-full h-auto rounded-xl border-2 border-dashed border-purple-400/45 bg-purple-400/5 p-3.5 text-left justify-start hover:border-purple-400/80 hover:bg-purple-400/10 disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-400/15 text-purple-300 mr-3">
                      <VideoIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        Attach a 30-sec intro video
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Hosts approve faster when they can see you
                      </span>
                    </span>
                    <UploadCloud className="h-4 w-4 text-purple-300 shrink-0" />
                  </Button>
                )}
                {uploadPct !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-[width] duration-200"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Submit with confirmation */}
              <Button
                size="lg"
                onClick={() => {
                  if (intro.trim().length < 10) {
                    toast.error("Write a short intro (at least 10 chars)");
                    return;
                  }
                  setConfirmOpen(true);
                }}
                disabled={requestMutation.isPending || uploadPct !== null}
                className="relative h-12 w-full rounded-2xl font-bold overflow-hidden"
              >
                <span className="absolute inset-0 overflow-hidden rounded-2xl">
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </span>
                {requestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending to host…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to host · get your spot
                  </>
                )}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                🔒 No payment until the host approves your intro.
              </p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Confirm join request dialog ────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-card backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Send your intro to the host?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your intro message and optional video will be sent to the host for review. No payment will be charged until they approve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestMutation.mutate()}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-violet-500 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send intro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function QuickInfoPill({
  icon,
  text,
  highlight,
  tappable,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
  tappable?: boolean;
  onClick?: () => void;
}) {
  if (tappable) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className={cn(
          "gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap h-auto",
          highlight
            ? "border-purple-500/40 bg-purple-500/15 text-purple-200 hover:bg-purple-500/20 hover:text-purple-100"
            : "border-border/40 bg-card/30 text-foreground/80 hover:border-purple-500/40 hover:text-foreground",
        )}
      >
        {icon}
        {text}
        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
      </Button>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
        highlight
          ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
          : "border-border/40 bg-card/30 text-foreground/80",
      )}
    >
      {icon}
      {text}
    </Badge>
  );
}

function MenuCard({
  item,
  currency,
}: {
  item: MenuItem;
  currency: string;
}) {
  return (
    <Card className="border-border/40 bg-card/30 shadow-none gap-0 py-0 rounded-xl transition-colors hover:border-purple-500/30 hover:bg-card/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{item.emoji}</span>
          <span className="flex-1 truncate text-sm font-medium text-foreground">
            {item.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-purple-300">
            {currency}
            {item.price}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 active:scale-90"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HostControlButton({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 rounded-xl border-border/40 bg-card/30 p-3 h-auto hover:border-purple-500/30 hover:bg-card/50 active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
        {icon}
      </span>
      <span className="text-xs font-semibold text-foreground/80">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <Badge className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white border-transparent p-0">
          {badge}
        </Badge>
      )}
    </Button>
  );
}

// ── Hero Gallery ───────────────────────────────────────────────────
function HeroGallery({
  gallery,
  coverUrl,
}: {
  gallery: PartyMedia[];
  coverUrl: string | null;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = galleryRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(Math.max(0, Math.min(gallery.length - 1, idx)));
    });
  };

  return (
    <>
      <div
        ref={galleryRef}
        onScroll={handleScroll}
        className="h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar"
      >
        <div className="flex h-full">
          {gallery.map((m, i) => (
            <div
              key={m.id ?? i}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              {m.type === "video" ? (
                <video
                  src={m.url}
                  poster={i === 0 && coverUrl ? coverUrl : undefined}
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={m.url}
                  alt={m.caption || `Party photo ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {gallery.length > 1 && (
        <div className="pointer-events-none absolute left-1/2 bottom-20 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {gallery.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full bg-white transition-all",
                i === activeIdx ? "w-4" : "w-1.5 opacity-40",
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Spotify Playlist with Auto-play ──────────────────────────────
function SpotifyPlaylistEmbed({ spotifyPlaylistUrl }: { spotifyPlaylistUrl: string }) {
  const [autoplayReady, setAutoplayReady] = useState(false);

  // Extract playlist ID from URL
  const playlistId = spotifyPlaylistUrl.replace("https://open.spotify.com/playlist/", "").split("?")[0].split("/")[0];
  const embedBase = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`;

  useEffect(() => {
    const timer = setTimeout(() => setAutoplayReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const iframeSrc = autoplayReady ? `${embedBase}&autoplay=1` : embedBase;

  return (
    <Card className="border-white/10 bg-card/30 shadow-none gap-0 py-0 rounded-2xl overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Music className="h-3.5 w-3.5 text-green-400" />
          Party Playlist 🎵
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <iframe
          src={iframeSrc}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
          title="Spotify Playlist"
        />
      </CardContent>
    </Card>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Hero skeleton */}
      <Skeleton className="h-[340px] w-full rounded-none" />
      <div className="-mt-8 space-y-6 px-4 lg:px-6 max-w-4xl mx-auto">
        {/* Quick info pills */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>

        {/* Title card skeleton */}
        <Card className="border-white/[0.06] bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
          <CardContent className="p-4 lg:p-6 space-y-4">
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-3 w-1/3 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vibe tags skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>

        <Skeleton className="h-px w-full" />

        {/* Location card skeleton */}
        <Card className="border-border/50 bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-3 w-16 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-3 w-1/2 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description skeleton */}
        <Card className="border-white/[0.06] bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Who's going skeleton */}
        <Card className="border-border/50 bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-3 w-24 rounded" />
            <div className="flex items-center gap-3">
              <div className="flex">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-background"
                    style={{ marginLeft: i === 1 ? 0 : -8 }}
                  />
                ))}
              </div>
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Reviews skeleton */}
        <Card className="border-white/[0.06] bg-card/40 shadow-none gap-0 py-0 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
