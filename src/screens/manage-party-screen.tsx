"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Trash2,
  UploadCloud,
  ImagePlus,
  Sparkles,
  Play,
  X,
  Loader2,
  Camera,
  MessageSquare,
  UtensilsCrossed,
  Images,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  type MenuItem,
  type Party,
  type PartyMedia,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Presets ────────────────────────────────────────────────────────────
// Reused inline (kept small — 4 photos + 2 video presets). Hosts can also
// upload from their device via the hidden file input below.
const PHOTO_PRESETS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
];

const VIDEO_PRESETS = [
  {
    url: "https://videos.pexels.com/video-files/2022395/2022395-uhd_3840_2160_24fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=400&q=60&auto=format&fit=crop",
  },
  {
    url: "https://videos.pexels.com/video-files/2795750/2795750-uhd_3840_2160_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=60&auto=format&fit=crop",
  },
];

const MAX_MEDIA = 12;

// Quick emoji presets for the menu add form — keep the picker simple (no
// full emoji library). Hosts can also type any emoji directly.
const EMOJI_PRESETS = [
  "🍹", "🍺", "🍷", "🥃", "🧉", // drinks
  "🍕", "🍟", "🌮", "🍗", "🥟", // snacks
  "🥤", "☕", "🧋", "🧃", "🥛", // soft
];

type MenuCategory = "drink" | "snack" | "soft";

const CATEGORIES: { id: MenuCategory; label: string; emoji: string }[] = [
  { id: "drink", label: "Drink", emoji: "🍸" },
  { id: "snack", label: "Snack", emoji: "🍟" },
  { id: "soft", label: "Soft", emoji: "🥤" },
];

const CATEGORY_CHIP: Record<MenuCategory, string> = {
  drink: "bg-purple-500/15 text-purple-300 border-purple-500/45",
  snack: "bg-teal-500/15 text-teal-300 border-teal-500/45",
  soft: "bg-amber-500/15 text-amber-300 border-amber-500/45",
};

export function ManagePartyScreen() {
  const selectedPartyId = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const qc = useQueryClient();

  // ── Data queries ───────────────────────────────────────────────────
  // Party payload includes media[] (image + video) + host + vibes + requests.
  // Menu is a separate query so add/delete mutations can invalidate it alone.
  const partyQuery = useQuery({
    queryKey: ["party", selectedPartyId],
    queryFn: () => api.getParty(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  const menuQuery = useQuery({
    queryKey: ["menu", selectedPartyId],
    queryFn: () => api.listMenu(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  const party = partyQuery.data?.party as Party | undefined;
  const mediaList = (party?.media ?? []) as PartyMedia[];
  const menuItems = (menuQuery.data?.items ?? []) as MenuItem[];
  const sym = party ? currencyForCity(party.city) : "£";

  // ── Inline add-menu form state ─────────────────────────────────────
  const [mName, setMName] = useState("");
  const [mPrice, setMPrice] = useState<string>("");
  const [mEmoji, setMEmoji] = useState("🍹");
  const [mCat, setMCat] = useState<MenuCategory>("drink");

  // ── Media uploader state ───────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  // ── Group-chat toggle ─────────────────────────────────────────────
  // Server is the source of truth (party.groupChatEnabled). While a toggle
  // mutation is in flight we render an optimistic local override so the
  // switch reflects the user's tap immediately.
  const [gcOptimistic, setGcOptimistic] = useState<boolean | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────
  const addMenuMutation = useMutation({
    mutationFn: (input: {
      partyId: string;
      name: string;
      price: number;
      emoji: string;
      category: MenuCategory;
    }) => api.addMenuItem(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", selectedPartyId] });
      toast.success("Menu item added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't add item"),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: string) => api.deleteMenuItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", selectedPartyId] });
      toast.success("Removed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't remove"),
  });

  const addMediaMutation = useMutation({
    mutationFn: (input: {
      partyId: string;
      url: string;
      type: "image" | "video";
      caption?: string;
    }) => api.addPartyMedia(input.partyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party", selectedPartyId] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't add media"),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: ({ partyId, mediaId }: { partyId: string; mediaId: string }) =>
      api.deletePartyMedia(partyId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party", selectedPartyId] });
      toast.success("Media removed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't remove media"),
  });

  // Upload via /api/upload → then create a PartyMedia row per file.
  const uploadMutation = useMutation({
    mutationFn: ({
      files,
      onProgress,
    }: {
      files: File[];
      onProgress?: (pct: number) => void;
    }) => api.uploadMedia(files, onProgress),
    onMutate: () => setUploadPct(0),
    onSuccess: async (data) => {
      const slotsLeft = MAX_MEDIA - mediaList.length;
      const accepted = data.files.slice(0, Math.max(0, slotsLeft));
      if (data.files.length > accepted.length) {
        toast.warning(
          `Only ${accepted.length} of ${data.files.length} added — gallery is full`,
        );
      }
      if (accepted.length === 0) {
        toast.error("Gallery is full — remove an item first");
        return;
      }
      // Persist each accepted upload as a PartyMedia row in parallel.
      try {
        await Promise.all(
          accepted.map((f) =>
            addMediaMutation.mutateAsync({
              partyId: selectedPartyId!,
              url: f.url,
              type: f.type,
              caption: f.name,
            }),
          ),
        );
        const imgs = accepted.filter((f) => f.type === "image").length;
        const vids = accepted.filter((f) => f.type === "video").length;
        const parts: string[] = [];
        if (imgs) parts.push(`${imgs} photo${imgs > 1 ? "s" : ""}`);
        if (vids) parts.push(`${vids} video${vids > 1 ? "s" : ""}`);
        toast.success(`Added ${parts.join(" + ")}`);
      } catch {
        // addMediaMutation's onError already toasted.
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Upload failed"),
    onSettled: () => setUploadPct(null),
  });

  const gcMutation = useMutation({
    mutationFn: ({ partyId, enabled }: { partyId: string; enabled: boolean }) =>
      api.setGroupChatEnabled(partyId, enabled),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["party", selectedPartyId] });
      toast.success(
        data.party?.groupChatEnabled
          ? "Group chat enabled"
          : "Group chat disabled",
      );
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    },
    onSettled: () => {
      // Clear the optimistic override — the server (now invalidated) is the
      // source of truth again.
      setGcOptimistic(null);
    },
  });

  // Resolved switch state: optimistic during a mutation, else server value.
  const gcEnabled =
    gcOptimistic !== null
      ? gcOptimistic
      : !!(party?.groupChatEnabled);

  // ── Derived: grouped menu ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const byCat: Record<MenuCategory, MenuItem[]> = {
      drink: [],
      snack: [],
      soft: [],
    };
    for (const it of menuItems) byCat[it.category]?.push(it);
    return byCat;
  }, [menuItems]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleAddMenuItem = () => {
    const name = mName.trim();
    if (!name) {
      toast.error("Add a name");
      return;
    }
    const price = Number(mPrice) || 0;
    if (price < 0) {
      toast.error("Price can't be negative");
      return;
    }
    if (!selectedPartyId) return;
    addMenuMutation.mutate({
      partyId: selectedPartyId,
      name,
      price,
      emoji: mEmoji.trim() || "•",
      category: mCat,
    });
    setMName("");
    setMPrice("");
    // Keep the selected emoji + category so adding several drinks is fast.
  };

  const handleFilePick = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const slotsLeft = MAX_MEDIA - mediaList.length;
    if (slotsLeft <= 0) {
      toast.error(`Gallery is full (${MAX_MEDIA} max)`);
      return;
    }
    const validTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/ogg",
    ]);
    const bad = files.find((f) => !validTypes.has(f.type));
    if (bad) {
      toast.error(`Unsupported file: ${bad.name}`, {
        description: "Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV",
      });
      return;
    }
    const tooBigImage = files.find(
      (f) => f.type.startsWith("image/") && f.size > 10 * 1024 * 1024,
    );
    if (tooBigImage) {
      toast.error(`"${tooBigImage.name}" is over 10 MB`);
      return;
    }
    const tooBigVideo = files.find(
      (f) => f.type.startsWith("video/") && f.size > 60 * 1024 * 1024,
    );
    if (tooBigVideo) {
      toast.error(`"${tooBigVideo.name}" is over 60 MB`);
      return;
    }
    const toUpload = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast.warning(
        `Only ${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} left — adding the first ${slotsLeft}`,
      );
    }
    uploadMutation.mutate({ files: toUpload });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPreset = (url: string, type: "image" | "video") => {
    if (!selectedPartyId) return;
    if (mediaList.length >= MAX_MEDIA) {
      toast.error(`Gallery is full (${MAX_MEDIA} max)`);
      return;
    }
    if (mediaList.some((m) => m.url === url)) {
      toast.message("Already in your gallery");
      return;
    }
    addMediaMutation.mutate({ partyId: selectedPartyId, url, type });
    toast.success(type === "image" ? "Photo added" : "Video added");
  };

  const handleRemoveMedia = (mediaId: string) => {
    if (!selectedPartyId) return;
    deleteMediaMutation.mutate({ partyId: selectedPartyId, mediaId });
  };

  const handleToggleGroupChat = (checked: boolean) => {
    if (!selectedPartyId) return;
    setGcOptimistic(checked); // optimistic override while mutation flies
    gcMutation.mutate({ partyId: selectedPartyId, enabled: checked });
  };

  // ── Empty state: no party selected ─────────────────────────────────
  if (!selectedPartyId) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Manage party</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl purple-foil">
            <UtensilsCrossed className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            No party selected
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Pick one of your parties to edit its menu, photos, videos, and
            group chat settings.
          </p>
          <button
            onClick={goBack}
            className="press-feedback glow-violet mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────
  const isLoading = partyQuery.isLoading || menuQuery.isLoading;
  if (isLoading) {
    return <ManagePartySkeleton onBack={goBack} />;
  }

  // ── Error state: party failed to load ──────────────────────────────
  if (!party) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Manage party</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <h2 className="font-display text-lg font-bold">Couldn't load party</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {partyQuery.error instanceof Error
              ? partyQuery.error.message
              : "Try again in a moment."}
          </p>
          <button
            onClick={() => partyQuery.refetch()}
            className="press-feedback glow-violet mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-screen-in">
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 glass px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full glass border border-white/10 text-white hover:bg-purple-400/10 active:scale-95 transition"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="eyebrow !text-[10px]">Manage your party</p>
          <h1 className="font-display text-base font-bold leading-tight truncate">
            {party.title}
          </h1>
        </div>
      </header>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        {/* ╔══ Menu items ══════════════════════════════════════════════════╗ */}
        <section className="glass-strong rounded-3xl border border-purple-400/40 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl purple-foil">
              <UtensilsCrossed className="h-4 w-4 text-purple-200" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-sm font-bold text-white">
                Menu &amp; drinks
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Add items guests can pre-order
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {menuItems.length} item{menuItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Inline add form */}
          <div className="rounded-2xl border border-white/10 bg-card/60 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={mEmoji}
                onChange={(e) => setMEmoji(e.target.value)}
                placeholder="🍹"
                aria-label="Emoji"
                maxLength={4}
                className="h-10 w-14 rounded-xl border-white/10 bg-card text-center text-lg"
              />
              <Input
                value={mName}
                onChange={(e) => setMName(e.target.value)}
                placeholder="Item name (e.g. Margarita)"
                aria-label="Item name"
                maxLength={60}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddMenuItem();
                }}
                className="h-10 flex-1 rounded-xl border-white/10 bg-card"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-300">
                  {sym}
                </span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={mPrice}
                  onChange={(e) => setMPrice(e.target.value)}
                  placeholder="0"
                  aria-label="Price"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMenuItem();
                  }}
                  className="h-10 rounded-xl border-white/10 bg-card pl-8"
                />
              </div>
              {/* 3-way category toggle */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-card p-1">
                {CATEGORIES.map((c) => {
                  const active = mCat === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMCat(c.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition active:scale-95",
                        active
                          ? "bg-purple-400/20 text-purple-100 ring-1 ring-purple-400/60"
                          : "text-muted-foreground hover:text-white",
                      )}
                    >
                      <span aria-hidden>{c.emoji}</span>
                      <span className="hidden xs:inline sm:inline">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick emoji row */}
            <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setMEmoji(e)}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-base transition active:scale-90",
                    mEmoji === e
                      ? "border-purple-400 bg-purple-400/15"
                      : "border-white/10 bg-card hover:border-purple-400/40",
                  )}
                  aria-label={`Use emoji ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleAddMenuItem}
              disabled={addMenuMutation.isPending}
              className="press-feedback glow-violet h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {addMenuMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" /> Add to menu
                </>
              )}
            </Button>
          </div>

          {/* Existing menu items, grouped by category */}
          {menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-muted-foreground">
              No menu items yet — add your first above.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto fancy-scrollbar space-y-3 pr-1">
              {CATEGORIES.map((c) => {
                const items = grouped[c.id];
                if (items.length === 0) return null;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          CATEGORY_CHIP[c.id],
                        )}
                      >
                        {c.emoji} {c.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 p-2.5"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10 text-lg">
                          {it.emoji || "•"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {it.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {sym}
                            {it.price.toLocaleString(undefined, {
                              minimumFractionDigits:
                                Number.isInteger(it.price) ? 0 : 2,
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMenuMutation.mutate(it.id)}
                          disabled={deleteMenuMutation.isPending}
                          aria-label={`Remove ${it.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-coral-500/60 hover:bg-coral-500/15 hover:text-coral-300 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ╔══ Photos & videos gallery ═════════════════════════════════════╗ */}
        <section className="glass-strong rounded-3xl border border-purple-400/40 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl teal-foil">
              <Images className="h-4 w-4 text-teal-200" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-sm font-bold text-white">
                Photos &amp; videos
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Up to {MAX_MEDIA} · gallery shown on the party detail page
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {mediaList.length}/{MAX_MEDIA}
            </span>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
            multiple
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files)}
          />

          {/* Upload progress bar */}
          {uploadPct !== null && (
            <div className="animate-screen-in rounded-xl border border-purple-400/30 bg-purple-400/5 p-2.5">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-purple-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-medium">Uploading… {uploadPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-[width] duration-200 ease-out"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Media grid */}
          {mediaList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-muted-foreground">
              No photos or videos yet. Add your first below.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-purple-400/30"
                >
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={m.caption || "Party media"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <video
                        src={m.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </span>
                    </>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(m.id)}
                    disabled={deleteMediaMutation.isPending}
                    aria-label="Remove media"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-coral-500/80 active:scale-90 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {m.caption && (
                    <span className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-1.5 py-0.5 text-[9px] text-white/90">
                      {m.caption}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Inline action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                uploadMutation.isPending ||
                addMediaMutation.isPending ||
                mediaList.length >= MAX_MEDIA
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/50 bg-teal-400/10 px-3 py-1.5 text-[11px] font-semibold text-teal-200 transition hover:bg-teal-400/20 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            >
              <UploadCloud className="h-3 w-3" />
              Upload from device
            </button>
            <button
              type="button"
              onClick={() => setPresetOpen((v) => !v)}
              disabled={
                uploadMutation.isPending || mediaList.length >= MAX_MEDIA
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1.5 text-[11px] font-medium text-purple-200 transition hover:bg-purple-400/15 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            >
              <Sparkles className="h-3 w-3" />
              {presetOpen ? "Hide presets" : "Presets"}
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            JPG / PNG / WebP / GIF up to 10 MB · MP4 / WebM / MOV up to 60 MB.
          </p>

          {/* Preset gallery — collapsible inline panel */}
          {presetOpen && (
            <div className="animate-screen-in space-y-3 rounded-2xl border border-white/10 bg-card/40 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-200">
                <ImagePlus className="h-3 w-3" /> Stock photos
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PHOTO_PRESETS.map((url) => {
                  const used = mediaList.some((m) => m.url === url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handleAddPreset(url, "image")}
                      disabled={
                        used ||
                        addMediaMutation.isPending ||
                        mediaList.length >= MAX_MEDIA
                      }
                      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 transition hover:border-purple-400/70 active:scale-95 disabled:opacity-40"
                      aria-label="Add stock photo"
                    >
                      <img
                        src={url}
                        alt="Preset"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {used && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                          <Check className="h-4 w-4 text-teal-300" />
                        </span>
                      )}
                      {!used && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                          <Plus className="h-4 w-4 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-200">
                <Play className="h-3 w-3" /> Stock videos
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VIDEO_PRESETS.map((v) => {
                  const used = mediaList.some((m) => m.url === v.url);
                  return (
                    <button
                      key={v.url}
                      type="button"
                      onClick={() => handleAddPreset(v.url, "video")}
                      disabled={
                        used ||
                        addMediaMutation.isPending ||
                        mediaList.length >= MAX_MEDIA
                      }
                      className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 transition hover:border-purple-400/70 active:scale-95 disabled:opacity-40"
                      aria-label="Add stock video"
                    >
                      <img
                        src={v.poster}
                        alt="Preset video"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                      {used && (
                        <span className="absolute right-1 top-1 rounded-md bg-teal-500/90 px-1 py-0.5 text-[9px] font-bold text-white">
                          ADDED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ╔══ Group chat toggle ══════════════════════════════════════════╗ */}
        <section className="glass-strong rounded-3xl border border-purple-400/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl purple-foil">
              <MessageSquare className="h-4 w-4 text-purple-200" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-sm font-bold text-white">
                Group chat
              </h2>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Let confirmed guests chat together before the night kicks off.
                Group chat unlocks for everyone as soon as the first guest pays.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    gcEnabled
                      ? "border-teal-400/50 bg-teal-400/15 text-teal-200"
                      : "border-white/10 bg-white/5 text-muted-foreground",
                  )}
                >
                  {gcEnabled ? "Enabled" : "Disabled"}
                </span>
                {gcMutation.isPending && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving…
                  </span>
                )}
              </div>
            </div>
            <Switch
              checked={!!gcEnabled}
              onCheckedChange={handleToggleGroupChat}
              disabled={gcMutation.isPending}
              aria-label="Toggle group chat"
            />
          </div>
        </section>
      </div>

      {/* ── Sticky footer CTA ──────────────────────────────────────────── */}
      <footer className="safe-bottom sticky bottom-0 z-20 border-t border-white/10 glass-strong px-4 py-3">
        <Button
          onClick={goBack}
          className="press-feedback glow-violet h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Check className="mr-1.5 h-4 w-4" /> Done
        </Button>
      </footer>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────
function ManagePartySkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col animate-screen-in">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 glass px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full glass border border-white/10 text-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="h-4 w-40" />
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4 space-y-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="glass-strong rounded-3xl border border-purple-400/40 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-48" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
