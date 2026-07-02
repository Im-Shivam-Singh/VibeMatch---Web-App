"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageSquare,
  UtensilsCrossed,
  Images,
  Check,
  RefreshCw,
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PHOTO_PRESETS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
];

const VIDEO_PRESETS = [
  {
    url: "https://videos.pexels.com/video-files/2022395/2022395-uhd_3840_2160_24fps.mp4",
    poster: "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=400&q=60&auto=format&fit=crop",
  },
  {
    url: "https://videos.pexels.com/video-files/2795750/2795750-uhd_3840_2160_30fps.mp4",
    poster: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=60&auto=format&fit=crop",
  },
];

const MAX_MEDIA = 12;

const EMOJI_PRESETS = [
  "🍹", "🍺", "🍷", "🥃", "🧉",
  "🍕", "🍟", "🌮", "🍗", "🥟",
  "🥤", "☕", "🧋", "🧃", "🥛",
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

  // Form state
  const [mName, setMName] = useState("");
  const [mPrice, setMPrice] = useState<string>("");
  const [mEmoji, setMEmoji] = useState("🍹");
  const [mCat, setMCat] = useState<MenuCategory>("drink");

  // Media state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  // Group chat state
  const [gcOptimistic, setGcOptimistic] = useState<boolean | null>(null);

  // ── Tab state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"menu" | "media" | "chat" | "settings">("menu");

  // ── Mutations ──────────────────────────────────────────────────
  const addMenuMutation = useMutation({
    mutationFn: (input: { partyId: string; name: string; price: number; emoji: string; category: MenuCategory }) =>
      api.addMenuItem(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", selectedPartyId] });
      toast.success("Menu item added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add item"),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: string) => api.deleteMenuItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", selectedPartyId] });
      toast.success("Removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't remove"),
  });

  const addMediaMutation = useMutation({
    mutationFn: (input: { partyId: string; url: string; type: "image" | "video"; caption?: string }) =>
      api.addPartyMedia(input.partyId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["party", selectedPartyId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add media"),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: ({ partyId, mediaId }: { partyId: string; mediaId: string }) =>
      api.deletePartyMedia(partyId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party", selectedPartyId] });
      toast.success("Media removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't remove media"),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ files, onProgress }: { files: File[]; onProgress?: (pct: number) => void }) =>
      api.uploadMedia(files, onProgress),
    onMutate: () => setUploadPct(0),
    onSuccess: async (data) => {
      const slotsLeft = MAX_MEDIA - mediaList.length;
      const accepted = data.files.slice(0, Math.max(0, slotsLeft));
      if (data.files.length > accepted.length) {
        toast.warning(`Only ${accepted.length} of ${data.files.length} added — gallery is full`);
      }
      if (accepted.length === 0) {
        toast.error("Gallery is full — remove an item first");
        return;
      }
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
      } catch { /* handled */ }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
    onSettled: () => setUploadPct(null),
  });

  const gcMutation = useMutation({
    mutationFn: ({ partyId, enabled }: { partyId: string; enabled: boolean }) =>
      api.setGroupChatEnabled(partyId, enabled),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["party", selectedPartyId] });
      toast.success(data.party?.groupChatEnabled ? "Group chat enabled" : "Group chat disabled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update"),
    onSettled: () => setGcOptimistic(null),
  });

  const gcEnabled = gcOptimistic !== null ? gcOptimistic : !!party?.groupChatEnabled;

  const grouped = useMemo(() => {
    const byCat: Record<MenuCategory, MenuItem[]> = { drink: [], snack: [], soft: [] };
    for (const it of menuItems) byCat[it.category]?.push(it);
    return byCat;
  }, [menuItems]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleAddMenuItem = () => {
    const name = mName.trim();
    if (!name) { toast.error("Add a name"); return; }
    const price = Number(mPrice) || 0;
    if (price < 0) { toast.error("Price can't be negative"); return; }
    if (!selectedPartyId) return;
    addMenuMutation.mutate({ partyId: selectedPartyId, name, price, emoji: mEmoji.trim() || "•", category: mCat });
    setMName("");
    setMPrice("");
  };

  const handleFilePick = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const slotsLeft = MAX_MEDIA - mediaList.length;
    if (slotsLeft <= 0) { toast.error(`Gallery is full (${MAX_MEDIA} max)`); return; }
    const validTypes = new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif","video/mp4","video/webm","video/quicktime","video/ogg"]);
    const bad = files.find((f) => !validTypes.has(f.type));
    if (bad) { toast.error(`Unsupported file: ${bad.name}`, { description: "Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV" }); return; }
    const tooBigImage = files.find((f) => f.type.startsWith("image/") && f.size > 10 * 1024 * 1024);
    if (tooBigImage) { toast.error(`"${tooBigImage.name}" is over 10 MB`); return; }
    const tooBigVideo = files.find((f) => f.type.startsWith("video/") && f.size > 60 * 1024 * 1024);
    if (tooBigVideo) { toast.error(`"${tooBigVideo.name}" is over 60 MB`); return; }
    const toUpload = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) toast.warning(`Only ${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} left`);
    uploadMutation.mutate({ files: toUpload });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPreset = (url: string, type: "image" | "video") => {
    if (!selectedPartyId) return;
    if (mediaList.length >= MAX_MEDIA) { toast.error(`Gallery is full (${MAX_MEDIA} max)`); return; }
    if (mediaList.some((m) => m.url === url)) { toast.message("Already in your gallery"); return; }
    addMediaMutation.mutate({ partyId: selectedPartyId, url, type });
    toast.success(type === "image" ? "Photo added" : "Video added");
  };

  const handleRemoveMedia = (mediaId: string) => {
    if (!selectedPartyId) return;
    deleteMediaMutation.mutate({ partyId: selectedPartyId, mediaId });
  };

  const handleToggleGroupChat = (checked: boolean) => {
    if (!selectedPartyId) return;
    setGcOptimistic(checked);
    gcMutation.mutate({ partyId: selectedPartyId, enabled: checked });
  };

  // ── Empty state ────────────────────────────────────────────────
  if (!selectedPartyId) {
    return (
      <div className="flex h-full flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
        >
          <div className="flex items-center gap-3">
            <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <span className="font-display text-lg font-bold text-foreground">Manage</span>
          </div>
        </motion.header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_-8px_rgba(83,74,183,0.3)]">
            <UtensilsCrossed className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">No party selected</h2>
          <p className="max-w-xs text-sm text-muted-foreground">Pick one of your parties to edit its menu, photos, videos, and group chat settings.</p>
          <motion.button onClick={goBack} whileTap={{ scale: 0.97 }} className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white">
            Go back
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  const isLoading = partyQuery.isLoading || menuQuery.isLoading;
  if (isLoading) return <ManagePartySkeleton onBack={goBack} />;

  // ── Error ──────────────────────────────────────────────────────
  if (!party) {
    return (
      <div className="flex h-full flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
        >
          <div className="flex items-center gap-3">
            <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <span className="font-display text-lg font-bold text-foreground">Manage</span>
          </div>
        </motion.header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="font-display text-xl font-bold text-foreground">Couldn&apos;t load party</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {partyQuery.error instanceof Error ? partyQuery.error.message : "Try again in a moment."}
          </p>
          <motion.button onClick={() => partyQuery.refetch()} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white">
            <RefreshCw className="h-4 w-4" /> Retry
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Tabs config ────────────────────────────────────────────────
  const TABS = [
    { id: "menu" as const, label: "Menu", icon: UtensilsCrossed },
    { id: "media" as const, label: "Media", icon: Images },
    { id: "chat" as const, label: "Group Chat", icon: MessageSquare },
    { id: "settings" as const, label: "Settings", icon: Sparkles },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={goBack}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Manage</p>
            <h1 className="font-display text-base font-bold leading-tight truncate text-foreground">{party.title}</h1>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                  isActive ? "text-white" : "text-white/35 hover:text-white/55",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="manage-tab"
                    className="absolute inset-0 rounded-xl bg-purple-500/15 border border-purple-500/25"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-3.5 w-3.5 relative z-10" />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.header>

      {/* Content */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Add menu item form */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15">
                    <Plus className="h-4 w-4 text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-sm font-bold text-foreground">Add Menu Item</h2>
                    <p className="text-[10px] text-muted-foreground">Guests can pre-order these</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={mEmoji}
                    onChange={(e) => setMEmoji(e.target.value)}
                    placeholder="🍹"
                    aria-label="Emoji"
                    maxLength={4}
                    className="h-10 w-14 rounded-xl border-white/[0.08] bg-white/[0.04] text-center text-lg"
                  />
                  <Input
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="Item name (e.g. Margarita)"
                    aria-label="Item name"
                    maxLength={60}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddMenuItem(); }}
                    className="h-10 flex-1 rounded-xl border-white/[0.08] bg-white/[0.04]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-300">{sym}</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={mPrice}
                      onChange={(e) => setMPrice(e.target.value)}
                      placeholder="0"
                      aria-label="Price"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddMenuItem(); }}
                      className="h-10 rounded-xl border-white/[0.08] bg-white/[0.04] pl-8"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
                    {CATEGORIES.map((c) => {
                      const active = mCat === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setMCat(c.id)}
                          aria-pressed={active}
                          className={cn(
                            "flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition",
                            active
                              ? "bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/40"
                              : "text-muted-foreground hover:text-white",
                          )}
                        >
                          <span aria-hidden>{c.emoji}</span>
                          <span className="hidden sm:inline">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
                  {EMOJI_PRESETS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setMEmoji(e)}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-base transition",
                        mEmoji === e
                          ? "border-purple-500/40 bg-purple-500/15"
                          : "border-white/[0.06] bg-white/[0.03] hover:border-purple-500/30",
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
                  className="h-10 w-full rounded-xl bg-purple-500 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"
                >
                  {addMenuMutation.isPending ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…</>
                  ) : (
                    <><Plus className="mr-1.5 h-4 w-4" /> Add to menu</>
                  )}
                </Button>
              </div>

              {/* Menu items list */}
              {menuItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-6 text-center text-xs text-muted-foreground">
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
                          <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", CATEGORY_CHIP[c.id])}>
                            {c.emoji} {c.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{items.length}</span>
                        </div>
                        {items.map((it) => (
                          <motion.div
                            key={it.id}
                            layout
                            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-lg">
                              {it.emoji || "•"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{it.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {sym}{it.price.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(it.price) ? 0 : 2 })}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteMenuMutation.mutate(it.id)}
                              disabled={deleteMenuMutation.isPending}
                              aria-label={`Remove ${it.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition hover:border-coral/40 hover:bg-coral/10 hover:text-coral disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "media" && (
            <motion.div
              key="media"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
                multiple
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files)}
              />

              {uploadPct !== null && (
                <div className="rounded-xl border border-purple-500/25 bg-purple-500/[0.06] p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-purple-200">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-medium">Uploading… {uploadPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-teal-400 transition-[width] duration-200" style={{ width: `${uploadPct}%` }} />
                  </div>
                </div>
              )}

              {mediaList.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20">
                    <Images className="h-6 w-6 text-teal-300" />
                  </div>
                  <p className="text-sm text-muted-foreground">No photos or videos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaList.map((m) => (
                    <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08]">
                      {m.type === "image" ? (
                        <img src={m.url} alt={m.caption || "Party media"} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <>
                          <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                            <Play className="h-5 w-5 fill-white text-white" />
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(m.id)}
                        disabled={deleteMediaMutation.isPending}
                        aria-label="Remove media"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-coral/80 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/[0.08] px-3.5 py-2 text-[11px] font-semibold text-teal-200 transition hover:bg-teal-500/15 disabled:opacity-40"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload from device
                </button>
                <button
                  type="button"
                  onClick={() => setPresetOpen((v) => !v)}
                  disabled={uploadMutation.isPending || mediaList.length >= MAX_MEDIA}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/[0.08] px-3.5 py-2 text-[11px] font-medium text-purple-200 transition hover:bg-purple-500/15 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {presetOpen ? "Hide presets" : "Presets"}
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground/50">{mediaList.length}/{MAX_MEDIA} · JPG/PNG/WebP/GIF ≤ 10 MB · MP4/WebM/MOV ≤ 60 MB</p>

              {presetOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"
                >
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
                          disabled={used || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] transition hover:border-purple-500/40 disabled:opacity-40"
                          aria-label="Add stock photo"
                        >
                          <img src={url} alt="Preset" className="h-full w-full object-cover" loading="lazy" />
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
                          disabled={used || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                          className="group relative aspect-video overflow-hidden rounded-lg border border-white/[0.08] transition hover:border-purple-500/40 disabled:opacity-40"
                          aria-label="Add stock video"
                        >
                          <img src={v.poster} alt="Preset video" className="h-full w-full object-cover" loading="lazy" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </span>
                          {used && (
                            <span className="absolute right-1 top-1 rounded-md bg-teal-500/90 px-1 py-0.5 text-[9px] font-bold text-white">ADDED</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 shadow-[0_0_16px_-4px_rgba(83,74,183,0.2)]">
                    <MessageSquare className="h-4.5 w-4.5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-base font-bold text-foreground">Group Chat</h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Let confirmed guests chat together before the night kicks off. Group chat unlocks for everyone as soon as the first guest pays.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                          gcEnabled
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-200"
                            : "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
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
              </div>

              {/* Member preview */}
              {gcEnabled && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Chat members</span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, party.guestCount + 1) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background",
                          i === 0 ? "bg-purple-500/20 text-purple-200" : "bg-teal-500/20 text-teal-200",
                        )}
                      >
                        {i === 0 ? (party.hostName?.[0] ?? "H") : "G"}
                      </div>
                    ))}
                    {party.guestCount > 4 && (
                      <span className="text-[11px] text-muted-foreground">+{party.guestCount - 4} more</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                  </div>
                  <h2 className="font-display text-sm font-bold text-foreground">Party Details</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium text-foreground truncate ml-4 max-w-[60%]">{party.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-medium text-foreground">{party.city}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Area</span>
                    <span className="font-medium text-foreground">{party.area}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-foreground">{party.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium text-foreground">{party.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-medium text-foreground">{sym}{party.fee}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max guests</span>
                    <span className="font-medium text-foreground">{party.maxGuests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Approval required</span>
                    <span className="font-medium text-foreground">{party.approvalRequired ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 border-t border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3">
        <Button
          onClick={goBack}
          className="h-12 w-full rounded-2xl bg-purple-500 text-sm font-semibold text-white hover:bg-purple-400"
        >
          <Check className="mr-1.5 h-4 w-4" /> Done
        </Button>
      </footer>
    </div>
  );
}

function ManagePartySkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 flex-1 rounded-xl" />
          ))}
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
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
