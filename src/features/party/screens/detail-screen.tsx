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

  // ── Description expand ──────────────────────────────────────────
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Menu category filter ────────────────────────────────────────
  const [menuCategory, setMenuCategory] = useState<string>("drink");

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Queries ─────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["party", id],
    queryFn: () => api.getParty(id!),
    enabled: !!id,
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

      // If the host User record exists, ensure a 1:1 chat thread first.
      // If the host profile is missing, skip thread creation — the API will
      // still accept the join request (it stores it as pending without a thread).
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
            })
            .catch(() => {});
        }
      } else {
        toast.error(msg || "Couldn't send request");
      }
    },
  });

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border/60 bg-card/50">
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Couldn't load this party.
        </p>
        <Button variant="outline" onClick={goBack} className="rounded-2xl">
          Go back
        </Button>
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
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-28 lg:pb-20"
      >
        {/* ── HERO WITH PARALLAX ──────────────────────────────────── */}
        <div className="relative h-[340px] w-full max-w-full overflow-hidden">
          <div
            className="absolute inset-0"
          >
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
                  <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6 text-center max-w-[260px]">
                    <Archive className="h-8 w-8 mx-auto text-white/50 mb-2" />
                    <p className="text-sm font-medium text-white/80">Media Cleaned</p>
                    <p className="text-xs text-white/50 mt-1">
                      {party.cleanedMessage || "Media files removed after 1 week post-event for storage optimization."}
                    </p>
                  </div>
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
                  <span
                    className="text-7xl"



                  >
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
            <button
              onClick={goBack}

              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-lg"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-20 flex items-center gap-2">
            <button
              onClick={share}

              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-lg"
              aria-label="Share"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={handleSaveToggle}

              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg"
              aria-label={saved ? "Unsave" : "Save"}
            >
              <div>
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    saved ? "fill-coral text-coral" : "text-white",
                  )}
                />
              </div>
            </button>
          </div>

          {/* ── Live / Starting Soon badge ──────────────────────────── */}
          {(liveStatus === "live" || liveStatus === "starting-soon") && (
            <div


              className="absolute left-4 bottom-6 z-20"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-sm",
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
              </span>
            </div>
          )}
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────── */}
        <div className="relative z-10 -mt-8 space-y-6 px-4 lg:px-6 max-w-4xl mx-auto">
          {/* Quick Info Bar */}
          <div



            className="flex items-center gap-3 overflow-x-auto no-scrollbar"
          >
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

          {/* Title Section */}
          <section



            className="space-y-3"
          >
            <h1 className="font-display text-2xl font-extrabold leading-tight text-foreground lg:text-3xl break-words">
              {party.title}
            </h1>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={host?.name ?? party.hostName ?? "Unknown Host"}
                src={host?.avatarUrl}
                size={36}
                ring
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    {host?.name ?? party.hostName ?? "Unknown Host"}
                  </span>
                  {host?.id && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold text-teal-300">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </span>
                  )}
                </div>
                {host?.id ? (
                  <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    View host profile →
                  </button>
                ) : (
                  <span className="text-xs text-white/40">Host profile unavailable</span>
                )}
              </div>
            </div>
          </section>

          {/* Vibe Tags */}
          <section



          >
            <div className="flex flex-wrap gap-2 pb-1">
              {vibes.map((v, i) => {
                const cls = VIBE_COLORS[v] || "bg-purple-500/15 text-purple-300 border-purple-500/45";
                return (
                  <span
                    key={v}



                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap",
                      cls,
                    )}
                  >
                    <span className="text-sm">{VIBE_EMOJI[v] || "✨"}</span>
                    {v}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

          {/* Location Card */}
          <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
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
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps?q=${party.lat},${party.lng}`,
                        "_blank",
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/5 py-2.5 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Maps
                  </button>
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
                    {/* Pulsing area circle */}
                    <div className="relative">
                      <div className="absolute -inset-6 rounded-full bg-purple-500/10 animate-pulse" />
                      <div className="absolute -inset-3 rounded-full bg-purple-500/15" />
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 ring-2 ring-purple-500/30">
                        <MapPin className="h-5 w-5 text-purple-300" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm">
                      <Lock className="h-2.5 w-2.5" /> Exact pin shown after payment
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Description (expandable) */}
          {party.description && (
            <section



              className="space-y-2"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                About this party
              </h3>
              <div className="relative overflow-hidden">
                <div


                  className="whitespace-pre-line text-sm leading-relaxed text-foreground/80 break-words"
                >
                  {party.description}
                </div>
                {!descExpanded && party.description.length > 120 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>
              {party.description.length > 120 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </section>
          )}

          {/* Who's Going */}
          <section



            className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Who's going
              </h3>
              {going > 0 && (
                <span className="text-xs font-semibold text-purple-300">
                  {going} {going === 1 ? "person" : "people"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {going === 0 ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground">
                    ?
                  </div>
                ) : userPartyStatus?.isInParty ? (
                  // Real avatars for party members
                  guestAvatars.map((src, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-xs font-bold overflow-hidden",
                        GUEST_COLORS[i % GUEST_COLORS.length],
                      )}
                      style={{
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: guestAvatars.length - i,
                      }}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))
                ) : (
                  // Masked silhouettes for non-members
                  Array.from({ length: Math.min(going, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-background",
                        GUEST_COLORS[i % GUEST_COLORS.length],
                      )}
                      style={{
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: Math.min(going, 5) - i,
                      }}
                    >
                      <Users className="h-4 w-4 opacity-60" />
                    </div>
                  ))
                )}
                {going > 5 && (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-white/5 text-[10px] font-bold text-muted-foreground"
                    style={{ marginLeft: -8 }}
                  >
                    +{going - 5}
                  </div>
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
                <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium">
                  See all
                </button>
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
          </section>

          {/* Security badge */}
          {party.securityBooked && (
            <section



              className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4 flex items-start gap-3"
            >
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
              <span className="shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                🔒 Safe
              </span>
            </section>
          )}

          {/* Menu Section */}
          {hasMenu && (
            <section



              className="space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Menu
              </h3>
              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {MENU_CATEGORIES.map((cat) => {
                  const count = allMenuItems.filter(
                    (i) => i.category === cat.key,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setMenuCategory(cat.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                        menuCategory === cat.key
                          ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                          : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          menuCategory === cat.key
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
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
            </section>
          )}

          {/* Reviews Section */}
          {party.id && (
            <section



            >
              <ReviewsSection partyId={party.id} isInParty={userPartyStatus?.isInParty} />
            </section>
          )}

          {/* Spotify Playlist Embed */}
          {party.spotifyPlaylistUrl && (
            <SpotifyPlaylistEmbed spotifyPlaylistUrl={party.spotifyPlaylistUrl} />
          )}

          {/* Host controls (if user is host) */}
          {isOwn && (
            <section



              className="space-y-3"
            >
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
            </section>
          )}

          {/* Bottom spacer for CTA */}
          <div className="h-24" />
        </div>
      </div>

      {/* ── INLINE CTA BAR ──────────────────────────────────────────── */}
      <div className="px-4 pb-6 lg:px-6 max-w-4xl mx-auto">
        <div



          className="rounded-2xl border border-white/10 bg-background/70 p-2.5 backdrop-blur-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] flex items-center gap-2.5"
        >
          {/* Save heart */}
          <button
            onClick={handleSaveToggle}

            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition",
              saved
                ? "border-coral/40 bg-coral/10 text-coral"
                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground",
            )}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <Heart className={cn("h-5 w-5", saved && "fill-coral")} />
          </button>

          {/* Primary CTA */}
          {isOwn ? (
            <button
              onClick={() => setScreen("manage-party")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Manage your party
            </button>
          ) : userPartyStatus?.isInParty ? (
            <button
              onClick={() => setScreen("tickets")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-bold text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {userPartyStatus.hasTicket ? "View Ticket" : "You're in!"}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={false}
              className={cn(
                "relative flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition overflow-hidden",
                isFull
                  ? "bg-white/5 text-muted-foreground"
                  : "bg-gradient-to-r from-purple-600 via-purple-500 to-violet-500 text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)]",
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
            </button>
          )}

          {/* Spots indicator */}
          {!isFull && left > 0 && (
            <div className="flex shrink-0 flex-col items-end justify-center pr-1">
              <span className="text-[10px] font-bold text-teal-400">
                {left} left
              </span>
              {party.approvalRequired && (
                <span className="text-[9px] text-amber-400">Approval</span>
              )}
            </div>
          )}
        </div>
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

          <div className="space-y-4 px-5 pb-5 pt-1 fancy-scrollbar max-h-[60vh] overflow-y-auto">
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
                  <button
                    type="button"
                    onClick={() => setIntroVideo(null)}
                    aria-label="Remove intro video"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-coral/80 active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {introVideo.name.slice(0, 24)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => introFileRef.current?.click()}
                  disabled={uploadPct !== null}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-purple-400/45 bg-purple-400/5 p-3.5 text-left transition hover:border-purple-400/80 hover:bg-purple-400/10 active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-400/15 text-purple-300">
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
                  <UploadCloud className="h-4 w-4 text-purple-300" />
                </button>
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

            {/* Submit */}
            <button
              type="button"
              onClick={() => {
                if (intro.trim().length < 10) {
                  toast.error("Write a short intro (at least 10 chars)");
                  return;
                }
                requestMutation.mutate();
              }}
              disabled={requestMutation.isPending || uploadPct !== null}
              className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 overflow-hidden"
            >
              <span className="absolute inset-0 overflow-hidden rounded-2xl">
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </span>
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending to host…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to host · get your spot
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-muted-foreground">
              🔒 No payment until the host approves your intro.
            </p>
          </div>
        </SheetContent>
      </Sheet>
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
  const Tag = tappable ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
        highlight
          ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
          : "border-border/40 bg-card/30 text-foreground/80",
        tappable && "hover:border-purple-500/40 hover:text-foreground cursor-pointer",
      )}
    >
      {icon}
      {text}
      {tappable && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
    </Tag>
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
    <div className="rounded-xl border border-border/40 bg-card/30 p-3 space-y-2 transition-colors hover:border-purple-500/30 hover:bg-card/50">
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
        <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 transition hover:bg-purple-500/20 active:scale-90">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
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
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/30 p-3 text-center transition hover:border-purple-500/30 hover:bg-card/50 active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
        {icon}
      </span>
      <span className="text-xs font-semibold text-foreground/80">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
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

              className="h-1.5 rounded-full bg-white"
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
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Music className="h-3.5 w-3.5 text-green-400" />
        Party Playlist 🎵
      </h3>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/30">
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
      </div>
    </section>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-0 animate-pulse">
      <div className="h-[340px] w-full rounded-none bg-muted/20" />
      <div className="-mt-8 space-y-4 px-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-muted/20" />
          ))}
        </div>
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-6 w-1/2 rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-muted/20" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
