"use client";

import { useEffect, useRef, useState } from "react";
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
  type PartyMedia,
} from "@/lib/types";
import { ReviewsSection } from "@/components/vibe/reviews-section";
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
import { cn } from "@/lib/utils";

// Hero background per first vibe — deep tinted colors from the spec
// (R&B/purple → #1a1035, Games/teal → #0d1f2d, Bollywood/green → #1a2410).
const VIBE_HERO_BG: Record<string, string> = {
  "R&B": "#1a1035",
  Bollywood: "#1a2410",
  BYOB: "#1a1035",
  Games: "#0d1f2d",
  "Lo-fi": "#1a1035",
  Chill: "#0d1f2d",
  EDM: "#1a1035",
  Retro: "#0d1f2d",
};

// Demo guest initials shown in the "Who's going" stack — full names are
// hidden until payment per the spec ("mystery is the mechanic").
const GUEST_INITIALS = ["P", "R", "J", "S"];
const GUEST_AVATAR_COLORS = [
  "bg-purple-500/30 text-purple-200",
  "bg-teal-500/25 text-teal-200",
  "bg-amber-500/25 text-amber-200",
  "bg-purple-500/20 text-purple-200",
];

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

  // ── "Get your spot" sheet state (purchase-flow rewrite) ───────────
  // Guest writes a short intro + optionally attaches a 30s intro video,
  // then we create the 1:1 thread + JoinRequest + intro messages and drop
  // them into the chat with the host (WhatsApp-style approval flow).
  const [spotSheetOpen, setSpotSheetOpen] = useState(false);
  const [intro, setIntro] = useState("");
  const [introVideo, setIntroVideo] = useState<{
    url: string;
    poster?: string;
    name: string;
  } | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const introFileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["party", id],
    queryFn: () => api.getParty(id!),
    enabled: !!id,
  });

  // Menu preview — drinks/snacks available for pre-order on the payment screen.
  const { data: menuData } = useQuery({
    queryKey: ["menu", id],
    queryFn: () => api.listMenu(id!),
    enabled: !!id,
  });

  // Record a view once per party detail mount (for host analytics)
  useEffect(() => {
    if (!id) return;
    api.recordView(id, currentUser?.id).catch(() => {
      /* non-blocking */
    });
  }, [id, currentUser?.id]);

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
    } catch {
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

  // ── Intro video upload (reuses /api/upload) ──────────────────────
  // Hoisted above the loading/error early returns so the useMutation below
  // respects the rules-of-hooks (hooks must run in the same order every
  // render, regardless of whether data has loaded yet).
  const handleIntroVideoPick = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith("video/")) {
      toast.error("Please pick a video file");
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      toast.error("Intro video must be under 60 MB", {
        description: "Trim it to ~30 seconds and try again",
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
  };

  // ── Submit the spot request: create thread + JoinRequest + messages ─
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !data?.host) throw new Error("Missing user or host");
      const threadRes = await api.ensureThread(
        currentUser.id,
        data.host.id,
        data.party.id,
      );
      const res = await api.sendRequest({
        partyId: data.party.id,
        requesterName: currentUser.name,
        introMessage: intro.trim(),
        requesterId: currentUser.id,
        threadId: threadRes.threadId,
        introVideoUrl: introVideo?.url,
        introVideoPoster: introVideo?.poster,
      });
      return { threadId: res.threadId ?? threadRes.threadId };
    },
    onSuccess: ({ threadId }) => {
      toast.success("Intro sent to the host! 🎬", {
        description: "Payment unlocks here once they approve.",
      });
      setSpotSheetOpen(false);
      setIntro("");
      setIntroVideo(null);
      qc.invalidateQueries({ queryKey: ["parties"] });
      qc.invalidateQueries({ queryKey: ["threads", currentUser?.id] });
      setSelectedThreadId(threadId);
      setScreen("chat");
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (msg.includes("declined")) {
        toast.error("Can't re-apply yet", {
          description: "You were declined for this event. Try again after it's over.",
        });
      } else if (msg.includes("queue") || msg.includes("Queue")) {
        toast.error("Queue is full", {
          description: "This event has too many pending applications. Try later.",
        });
      } else if (msg.includes("pending") || msg.includes("Pending")) {
        toast.info("You already have a pending request", {
          description: "Opening your chat with the host…",
        });
        if (data?.host && currentUser) {
          api
            .ensureThread(currentUser.id, data.host.id, data.party.id)
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

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="animate-screen-in space-y-4 p-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
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
  const firstVibe = vibes[0] || parseVibes(party.vibes)[0] || "Chill";
  const heroBg = VIBE_HERO_BG[firstVibe] || "#1a1035";
  const heroEmoji = VIBE_EMOJI[firstVibe] || "✨";
  const currency = currencyForCity(party.city);
  const left = slotsLeft(party.maxGuests, party.guestCount);
  const going = party.guestCount;
  const isFull = left === 0;
  const isLow = left > 0 && left <= 2;
  const isOwn = !!currentUser && !!host && currentUser.id === host.id;

  // ── Media gallery ───────────────────────────────────────────────────
  // Build the gallery items list: prefer the party's media array, fall back
  // to a single cover entry, and finally to an empty list which renders the
  // vibe-color + emoji fallback.
  const gallery: PartyMedia[] = (() => {
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

  // End time = start + 4h (matches the spec's ~4h default party duration)
  const [hStr, mStr] = party.time.split(":");
  const startH = parseInt(hStr, 10) || 0;
  const startM = parseInt(mStr, 10) || 0;
  const endTotalMin = startH * 60 + startM + 4 * 60;
  const endH = Math.floor(endTotalMin / 60) % 24;
  const endM = endTotalMin % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  const feeLabel = formatFee(party.fee, party.city);
  const menuItems = (menuData?.items ?? []).slice(0, 4);
  const menuOverflow = (menuData?.items ?? []).length - menuItems.length;

  const handleJoin = () => {
    if (!currentUser) {
      toast.error("Sign in to get your spot");
      return;
    }
    if (isFull) {
      toast.info("Sold out — join the waitlist", {
        description: "Send your intro — if a spot opens, the host can approve you.",
      });
    }
    // Open the "Get your spot" sheet (intro + optional intro video) instead
    // of jumping straight to payment. Payment unlocks after host approval.
    setSpotSheetOpen(true);
  };

  const handleSaveToggle = () => {
    toggleSaved(id!);
    toast.success(saved ? "Removed from saved" : "Saved!", {
      duration: 1500,
    });
  };

  return (
    <div className="flex h-full flex-col animate-screen-in">
      {/* Scrollable content */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto pb-44">
        {/* ── HERO / MEDIA GALLERY ───────────────────────────────────── */}
        <MediaGallery
          key={party.id}
          gallery={gallery}
          hasGallery={hasGallery}
          heroBg={heroBg}
          heroEmoji={heroEmoji}
          coverUrl={party.coverUrl ?? null}
          goBack={goBack}
          share={share}
          firstVibe={firstVibe}
          isFull={isFull}
          isLow={isLow}
          left={left}
          going={going}
        />

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div className="space-y-4 p-4">
          {/* Title row */}
          <section className="space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="flex-1 font-display text-xl font-bold leading-tight text-foreground">
                {party.title}
              </h1>
              <span className="shrink-0 rounded-lg bg-purple-500/20 px-2.5 py-1 text-sm font-medium text-purple-300">
                {feeLabel} entry
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Pay once · drinks add-on available after
            </p>
          </section>

          {/* Meta grid 2×2 */}
          <section className="grid grid-cols-2 gap-2">
            <MetaCell
              emoji="📅"
              text={`${formatDateLabel(party.date)} · ${formatTime(party.time)}`}
            />
            <MetaCell emoji="🕑" text={`Ends ~${formatTime(endTime)}`} />
            <MetaCell emoji="📍" text={`${party.area}, ${party.city}`} />
            <MetaCell emoji="👥" text={`Max ${party.maxGuests} guests`} />
          </section>

          {/* Tag row — multi-color vibe chips + visual 21+/Students tags */}
          <section className="flex flex-wrap gap-1.5">
            {vibes.map((v) => {
              const cls =
                v === "EDM"
                  ? "bg-purple-500/15 text-purple-300 font-medium border-purple-500/45"
                  : VIBE_COLORS[v] ||
                    "bg-purple-500/15 text-purple-300 border-purple-500/45";
              return (
                <span
                  key={v}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                    cls,
                  )}
                >
                  {v}
                </span>
              );
            })}
            {party.fee > 0 && (
              <span className="rounded-full border border-coral/35 bg-coral/10 px-2.5 py-0.5 text-[11px] font-semibold text-coral">
                21+
              </span>
            )}
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Students
            </span>
          </section>

          {/* Host card — with teal Verified badge */}
          {host && (
            <section className="glass flex items-center gap-3 rounded-2xl p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-sm font-bold text-purple-200">
                {host.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {host.name}
                  </p>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground/90">
                  <span className="text-amber-300">★★★★★</span>{" "}
                  <span className="font-medium text-foreground/80">
                    {host.rating.toFixed(1)}
                  </span>{" "}
                  · {host.hosted} parties
                </p>
              </div>
              {!isOwn && (
                <button
                  onClick={messageHost}
                  className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-purple-500/40 bg-purple-500/10 px-2.5 text-[11px] font-semibold text-purple-300 transition active:scale-95 hover:bg-purple-500/15"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="truncate">Message</span>
                </button>
              )}
            </section>
          )}

          {/* Security booking badge — shows when the host has booked a bouncer.
              This is a major trust signal, especially for women guests. */}
          {party.securityBooked && (
            <section className="rounded-2xl border border-teal-500/30 bg-teal-500/8 p-3 flex items-start gap-3 animate-screen-in">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Verified security on-site
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Host has booked a licensed security person for this party.
                  Go worry-free — show up, vibe, and feel safe.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                🔒 Safe
              </span>
            </section>
          )}

          {/* Who's going — guest initials, locked until payment */}
          <section className="glass rounded-2xl p-3">
            <span className="eyebrow">Who's going</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center">
                {GUEST_INITIALS.map((letter, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border border-card text-[11px] font-bold",
                      GUEST_AVATAR_COLORS[i % GUEST_AVATAR_COLORS.length],
                    )}
                    style={{
                      marginLeft: i === 0 ? 0 : -8,
                      zIndex: GUEST_INITIALS.length - i,
                    }}
                  >
                    {letter}
                  </div>
                ))}
                {going > GUEST_INITIALS.length && (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-card bg-white/5 text-[10px] font-bold text-muted-foreground"
                    style={{ marginLeft: -8 }}
                  >
                    +{going - GUEST_INITIALS.length}
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {going} going
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Full names visible after payment
            </p>
          </section>

          {/* About this party */}
          {party.description && (
            <section className="space-y-1.5">
              <span className="eyebrow">About this party</span>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {party.description}
              </p>
            </section>
          )}

          {/* Menu preview */}
          <section className="glass rounded-2xl p-3">
            <span className="eyebrow">Menu preview</span>
            {menuItems.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No pre-order menu
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {menuItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-foreground">
                      <span className="text-base leading-none">
                        {item.emoji}
                      </span>
                      <span className="truncate font-medium">{item.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-purple-300">
                      {currency}
                      {item.price}
                    </span>
                  </li>
                ))}
                {menuOverflow > 0 && (
                  <li className="text-xs text-muted-foreground">
                    +{menuOverflow} more
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Reviews — KEEP existing ReviewsSection component */}
          {party.id && <ReviewsSection partyId={party.id} />}
        </div>
      </div>

      {/* ── STICKY CTA — Join for £N · get your spot ────────────────── */}
      <div className="fixed inset-x-0 bottom-[88px] z-30 mx-auto max-w-[480px] px-4">
        <div className="flex items-center gap-2">
          {/* Save / heart toggle */}
          <button
            onClick={handleSaveToggle}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95",
              saved
                ? "border-coral/50 bg-coral/15 text-coral"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <Heart className={cn("h-5 w-5", saved && "fill-coral")} />
          </button>

          {/* Primary CTA */}
          {isOwn ? (
            <button
              onClick={() => setScreen("manage-party")}
              className="press-feedback glow-violet flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              Manage your party
            </button>
          ) : (
            <button
              onClick={handleJoin}
              className={cn(
                "press-feedback flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                isFull
                  ? "bg-white/8 text-muted-foreground"
                  : "glow-violet bg-primary text-primary-foreground",
              )}
            >
              {isFull ? (
                "Sold out — join waitlist"
              ) : (
                <>
                  <span>Join for {feeLabel}</span>
                  <span className="opacity-50">·</span>
                  <span>get your spot</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── "Get your spot" sheet (purchase-flow rewrite) ─────────────── */}
      <Sheet open={spotSheetOpen} onOpenChange={setSpotSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[480px] rounded-t-3xl border-white/10 glass-strong p-0"
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
              <label className="text-xs font-semibold uppercase tracking-wide text-white">
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
              <label className="text-xs font-semibold uppercase tracking-wide text-white">
                Intro video <span className="text-muted-foreground">(optional · ≤60 MB)</span>
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
              className="press-feedback glow-violet flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
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

// ── Meta cell for the 2×2 meta grid ──────────────────────────────────
function MetaCell({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-white/4 p-2.5 text-xs">
      <span aria-hidden className="text-sm leading-none">
        {emoji}
      </span>
      <span className="min-w-0 truncate text-foreground/80">{text}</span>
    </div>
  );
}

// ── Media gallery hero ─────────────────────────────────────────────────
// Isolated as its own component so we can `key={party.id}` it on the parent
// and let React unmount/remount when the user navigates between parties —
// this naturally resets internal carousel state (activeIdx + scroll position)
// without needing setState-in-effect (which the lint rule disallows).
interface MediaGalleryProps {
  gallery: PartyMedia[];
  hasGallery: boolean;
  heroBg: string;
  heroEmoji: string;
  coverUrl: string | null;
  goBack: () => void;
  share: () => void;
  firstVibe: string;
  isFull: boolean;
  isLow: boolean;
  left: number;
  going: number;
}

function MediaGallery({
  gallery,
  hasGallery,
  heroBg,
  heroEmoji,
  coverUrl,
  goBack,
  share,
  firstVibe,
  isFull,
  isLow,
  left,
  going,
}: MediaGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Compute the active slide on scroll. requestAnimationFrame-debounced so
  // we don't churn state on every pixel of scroll movement.
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

  const scrollToSlide = (idx: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActiveIdx(idx);
  };

  return (
    <>
      <div
        className="relative h-56 w-full overflow-hidden"
        style={{ background: heroBg }}
      >
        {hasGallery ? (
          <div
            ref={galleryRef}
            onScroll={handleScroll}
            className="no-scrollbar h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
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
                  {/* Gradient sheen only over image slides (videos get a
                      flat gradient that doesn't fight with native controls) */}
                  {m.type === "image" && (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                  )}
                  {m.caption && (
                    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur-sm">
                      {m.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Fallback: vibe-color background + large emoji centerpiece
          // (preserves the original hero look when there's no media).
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="vibe-float text-5xl opacity-90" aria-hidden>
                {heroEmoji}
              </span>
            </div>
          </>
        )}

        {/* Back button (top-left, 32px round) */}
        <button
          onClick={goBack}
          className="absolute left-3 top-[max(env(safe-area-inset-top),12px)] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Share button (top-right, 32px round) */}
        <button
          onClick={share}
          className="absolute right-3 top-[max(env(safe-area-inset-top),12px)] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition active:scale-95"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {/* Dot indicator row (only when more than one slide) */}
        {hasGallery && gallery.length > 1 && (
          <div className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),52px)] z-10 flex -translate-x-1/2 items-center gap-1.5">
            {gallery.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/45",
                )}
              />
            ))}
          </div>
        )}

        {/* Theme pill (bottom-left) */}
        <span className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {firstVibe}
        </span>

        {/* Spots pill (bottom-right) */}
        {isFull ? (
          <span className="absolute bottom-3 right-3 z-10 rounded-lg bg-coral px-2.5 py-1 text-xs font-semibold text-white">
            Sold out
          </span>
        ) : isLow ? (
          <span className="absolute bottom-3 right-3 z-10 rounded-lg bg-coral/80 px-2.5 py-1 text-xs font-semibold text-white">
            {left} left!
          </span>
        ) : (
          <span className="absolute bottom-3 right-3 z-10 rounded-lg bg-purple-500/80 px-2.5 py-1 text-xs font-semibold text-white">
            {going} going · {left} left
          </span>
        )}
      </div>

      {/* Thumbnail strip — only show when more than one media item.
          Lets the user jump directly to a specific slide. */}
      {hasGallery && gallery.length > 1 && (
        <div className="no-scrollbar -mt-3 relative z-10 flex gap-2 overflow-x-auto px-4 pb-1">
          {gallery.map((m, i) => (
            <button
              key={m.id ?? `thumb-${i}`}
              onClick={() => scrollToSlide(i)}
              aria-label={`View media ${i + 1}`}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition active:scale-95",
                i === activeIdx
                  ? "border-purple-400 ring-2 ring-purple-400/60"
                  : "border-white/10 hover:border-purple-400/40",
              )}
            >
              {m.type === "video" ? (
                <>
                  <img
                    src={i === 0 && coverUrl ? coverUrl : m.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                  </span>
                </>
              ) : (
                <img
                  src={m.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
