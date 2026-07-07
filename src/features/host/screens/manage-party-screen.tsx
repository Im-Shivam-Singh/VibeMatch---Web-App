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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
    const tooBigImage = files.find((f) => f.type.startsWith("image/") && f.size > 5 * 1024 * 1024);
    if (tooBigImage) { toast.error(`"${tooBigImage.name}" is over 5 MB`); return; }
    const tooBigVideo = files.find((f) => f.type.startsWith("video/") && f.size > 5 * 1024 * 1024);
    if (tooBigVideo) { toast.error(`"${tooBigVideo.name}" is over 5 MB`); return; }
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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack} aria-label="Back" className="rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-display text-lg font-bold text-foreground">Manage</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_-8px_rgba(83,74,183,0.3)]">
            <UtensilsCrossed className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">No party selected</h2>
          <p className="max-w-xs text-sm text-muted-foreground">Pick one of your parties to edit its menu, photos, videos, and group chat settings.</p>
          <Button onClick={goBack} className="rounded-2xl bg-purple-500 hover:bg-purple-400">
            Go back
          </Button>
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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack} aria-label="Back" className="rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-display text-lg font-bold text-foreground">Manage</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 border border-coral/20">
            <RefreshCw className="h-5 w-5 text-coral" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Couldn&apos;t load party</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {partyQuery.error instanceof Error ? partyQuery.error.message : "Try again in a moment."}
          </p>
          <Button
            onClick={() => partyQuery.refetch()}
            className="gap-2 rounded-2xl bg-purple-500 hover:bg-purple-400"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
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
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Manage</p>
            <h1 className="font-display text-base font-bold leading-tight truncate text-foreground">{party.title}</h1>
          </div>
        </div>
      </header>

      {/* Content with Tabs */}
      <Tabs defaultValue="menu" className="flex flex-1 flex-col">
        <div className="px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="menu" className="gap-1.5 flex-1">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 flex-1">
              <Images className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 flex-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 flex-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32">
          {/* ── Menu Tab ────────────────────────────────────────── */}
          <TabsContent value="menu" className="space-y-4 mt-0">
            {/* Add menu item form */}
            <Card className="border-border/40 py-0 gap-0">
              <CardContent className="p-4 space-y-3">
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
                    className="h-10 w-14 rounded-xl text-center text-lg"
                  />
                  <Input
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="Item name (e.g. Margarita)"
                    aria-label="Item name"
                    maxLength={60}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddMenuItem(); }}
                    className="h-10 flex-1 rounded-xl"
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
                      className="h-10 rounded-xl pl-8"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/50 p-1">
                    {CATEGORIES.map((c) => {
                      const active = mCat === c.id;
                      return (
                        <Button
                          key={c.id}
                          type="button"
                          variant={active ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setMCat(c.id)}
                          aria-pressed={active}
                          className={cn(
                            "h-8 gap-1 rounded-lg text-[11px] font-semibold px-2.5",
                            active
                              ? "bg-purple-500/20 text-purple-200 hover:bg-purple-500/25"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span aria-hidden>{c.emoji}</span>
                          <span className="hidden sm:inline">{c.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
                  {EMOJI_PRESETS.map((e) => (
                    <Button
                      key={e}
                      type="button"
                      variant={mEmoji === e ? "default" : "outline"}
                      size="icon"
                      onClick={() => setMEmoji(e)}
                      aria-label={`Use emoji ${e}`}
                      className={cn(
                        "h-8 w-8 shrink-0 text-base",
                        mEmoji === e
                          ? "bg-purple-500/15 border-purple-500/40 hover:bg-purple-500/20"
                          : "",
                      )}
                    >
                      {e}
                    </Button>
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
              </CardContent>
            </Card>

            {/* Menu items list */}
            {menuItems.length === 0 ? (
              <Card className="border-dashed border-border/40 py-0 gap-0">
                <CardContent className="p-6 text-center text-xs text-muted-foreground">
                  No menu items yet — add your first above.
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-96 overflow-y-auto fancy-scrollbar space-y-3 pr-1">
                {CATEGORIES.map((c) => {
                  const items = grouped[c.id];
                  if (items.length === 0) return null;
                  return (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-bold uppercase tracking-wide", CATEGORY_CHIP[c.id])}
                        >
                          {c.emoji} {c.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{items.length}</span>
                      </div>
                      {items.map((it) => (
                        <Card key={it.id} className="py-0 gap-0 border-border/40">
                          <CardContent className="flex items-center gap-3 p-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-lg">
                              {it.emoji || "•"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{it.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {sym}{it.price.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(it.price) ? 0 : 2 })}
                              </p>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled={deleteMenuMutation.isPending}
                                  aria-label={`Remove ${it.name}`}
                                  className="h-8 w-8 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove &quot;{it.name}&quot;?</DialogTitle>
                                  <DialogDescription>
                                    This will remove the item from your menu. Guests who already pre-ordered it won&apos;t be affected.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" asChild>
                                    <DialogClose>Cancel</DialogClose>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteMenuMutation.mutate(it.id)}
                                  >
                                    Remove
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Media Tab ──────────────────────────────────────────── */}
          <TabsContent value="media" className="space-y-4 mt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
              multiple
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files)}
            />

            {uploadPct !== null && (
              <Card className="border-purple-500/25 bg-purple-500/[0.06] py-0 gap-0">
                <CardContent className="p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-purple-200">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-medium">Uploading… {uploadPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-teal-400 transition-[width] duration-200" style={{ width: `${uploadPct}%` }} />
                  </div>
                </CardContent>
              </Card>
            )}

            {mediaList.length === 0 ? (
              <Card className="border-dashed border-border/40 py-0 gap-0">
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20">
                    <Images className="h-6 w-6 text-teal-300" />
                  </div>
                  <p className="text-sm text-muted-foreground">No photos or videos yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaList.map((m) => (
                  <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border/40">
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveMedia(m.id)}
                      disabled={deleteMediaMutation.isPending}
                      aria-label="Remove media"
                      className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/65 text-white border-0 hover:bg-destructive/80 hover:text-white disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                className="gap-1.5 rounded-xl border-teal-500/30 bg-teal-500/[0.08] text-teal-200 hover:bg-teal-500/15 disabled:opacity-40"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload from device
              </Button>
              <Button
                variant="outline"
                onClick={() => setPresetOpen((v) => !v)}
                disabled={uploadMutation.isPending || mediaList.length >= MAX_MEDIA}
                className="gap-1.5 rounded-xl border-purple-500/30 bg-purple-500/[0.08] text-purple-200 hover:bg-purple-500/15 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {presetOpen ? "Hide presets" : "Presets"}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/50">{mediaList.length}/{MAX_MEDIA} · JPG/PNG/WebP/GIF ≤ 5 MB · MP4/WebM/MOV ≤ 5 MB</p>

            {presetOpen && (
              <Card className="border-border/40 py-0 gap-0">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-200">
                    <ImagePlus className="h-3 w-3" /> Stock photos
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {PHOTO_PRESETS.map((url) => {
                      const used = mediaList.some((m) => m.url === url);
                      return (
                        <Button
                          key={url}
                          variant="outline"
                          onClick={() => handleAddPreset(url, "image")}
                          disabled={used || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                          className="group relative aspect-square h-auto w-full overflow-hidden rounded-lg p-0 hover:border-purple-500/40 disabled:opacity-40"
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
                        </Button>
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
                        <Button
                          key={v.url}
                          variant="outline"
                          onClick={() => handleAddPreset(v.url, "video")}
                          disabled={used || addMediaMutation.isPending || mediaList.length >= MAX_MEDIA}
                          className="group relative aspect-video h-auto w-full overflow-hidden rounded-lg p-0 hover:border-purple-500/40 disabled:opacity-40"
                          aria-label="Add stock video"
                        >
                          <img src={v.poster} alt="Preset video" className="h-full w-full object-cover" loading="lazy" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </span>
                          {used && (
                            <Badge className="absolute right-1 top-1 bg-teal-500/90 text-[9px] font-bold text-white">
                              ADDED
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Chat Tab ──────────────────────────────────────────── */}
          <TabsContent value="chat" className="space-y-4 mt-0">
            <Card className="border-border/40 py-0 gap-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 shadow-[0_0_16px_-4px_rgba(83,74,183,0.2)]">
                    <MessageSquare className="h-5 w-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-base font-bold text-foreground">Group Chat</h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Let confirmed guests chat together before the night kicks off. Group chat unlocks for everyone as soon as the first guest pays.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wide",
                          gcEnabled
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-200"
                            : "border-border/40 bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {gcEnabled ? "Enabled" : "Disabled"}
                      </Badge>
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
              </CardContent>
            </Card>

            {/* Member preview */}
            {gcEnabled && (
              <Card className="border-border/40 py-0 gap-0">
                <CardContent className="p-4 space-y-3">
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Settings Tab ──────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4 mt-0">
            <Card className="border-border/40 py-0 gap-0">
              <CardContent className="p-4 space-y-4">
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
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      party.approvalRequired
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-border/40 bg-muted/50 text-muted-foreground",
                    )}>
                      {party.approvalRequired ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 border-t border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3">
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
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
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
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="py-0 gap-0 border-border/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-48" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
