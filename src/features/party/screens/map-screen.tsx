"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  List,
  MapPin,
  Sparkles,
  Crosshair,
  Flame,
  Navigation,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import type * as LType from "leaflet";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CITIES,
  CITY_CENTERS,
  VIBE_EMOJI,
  FUN_TIER_META,
  haversineKm,
  partyCoords,
  partyLiveStatus,
  parseVibes,
  funScore,
  funTier,
  type Party,
  type FunTier,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const RADII = [1, 2, 5, 10, 25] as const;
type Radius = (typeof RADII)[number];

const RADIUS_ZOOM: Record<Radius, number> = {
  1: 15,
  2: 14,
  5: 13,
  10: 12,
  25: 10,
};

const CARTO_VOYAGER_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TIER_BAR: Record<FunTier, string> = {
  low: "bg-purple-400",
  warm: "bg-amber-400",
  lively: "bg-teal-400",
  lit: "bg-purple-400",
};

function latLngToContainerPixel(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  zoom: number,
): { x: number; y: number } {
  const tileSize = 256;
  const worldSize = tileSize * Math.pow(2, zoom);
  const toWorld = (la: number, ln: number) => {
    const latRad = (la * Math.PI) / 180;
    const x = ((ln + 180) / 360) * worldSize;
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;
    return { x, y };
  };
  const c = toWorld(centerLat, centerLng);
  const p = toWorld(lat, lng);
  return { x: p.x - c.x, y: p.y - c.y };
}

function buildMapLinkUrl(lat: number, lng: number, zoom: number) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=${zoom}`;
}

interface ProjectedParty {
  party: Party;
  coords: { lat: number; lng: number };
  dist: number;
  score: number;
  tier: FunTier;
  isLive: boolean;
  dimmed: boolean;
  cx: number;
  cy: number;
}

export function MapScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const cityFilter = useAppStore((s) => s.cityFilter);
  const userLocation = useAppStore((s) => s.userLocation);
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  const [radius, setRadius] = useState<Radius>(5);
  const [liveOnly, setLiveOnly] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LType.Map | null>(null);

  const center = useMemo<{ lat: number; lng: number; label: string }>(() => {
    if (userLocation) return userLocation;
    if (cityFilter && CITY_CENTERS[cityFilter]) return { ...CITY_CENTERS[cityFilter], label: cityFilter };
    return { lat: 20.5937, lng: 78.9629, label: "India" };
  }, [userLocation, cityFilter]);

  const zoom = RADIUS_ZOOM[radius];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", "near", center.lat, center.lng, radius, cityFilter],
    queryFn: () => api.listPartiesNear({ lat: center.lat, lng: center.lng, radiusKm: radius, city: cityFilter ?? undefined }),
    staleTime: 30_000,
  });

  const allParties = data?.parties ?? [];

  const parties = useMemo<ProjectedParty[]>(() => {
    const withMeta: ProjectedParty[] = allParties.map((p) => {
      const coords = partyCoords(p);
      const dist = haversineKm(center, coords);
      const score = funScore(p);
      const tier = funTier(score);
      const isLive = partyLiveStatus(p.date, p.time) === "live";
      return { party: p, coords, dist, score, tier, isLive, dimmed: false, cx: 0, cy: 0 };
    });
    if (liveOnly) return withMeta.sort((a, b) => { if (a.isLive !== b.isLive) return a.isLive ? -1 : 1; return a.dist - b.dist; });
    return withMeta.sort((a, b) => a.dist - b.dist);
  }, [allParties, center, liveOnly]);

  const projectedParties = useMemo<ProjectedParty[]>(() => {
    const out = parties.map((m) => {
      const { x, y } = latLngToContainerPixel(m.coords.lat, m.coords.lng, center.lat, center.lng, zoom);
      const cx = Math.max(-220, Math.min(220, x));
      const cy = Math.max(-260, Math.min(260, y));
      return { ...m, cx, cy, dimmed: liveOnly && !m.isLive };
    });
    const MIN_DIST = 14;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const dx = out[j].cx - out[i].cx;
          const dy = out[j].cy - out[i].cy;
          const d = Math.hypot(dx, dy);
          if (d < MIN_DIST) {
            if (d < 0.001) { out[j].cx += MIN_DIST; out[j].cy += MIN_DIST * 0.4; }
            else { const overlap = (MIN_DIST - d) / 2 + 1; const nx = dx / d; const ny = dy / d; out[i].cx -= nx * overlap; out[i].cy -= ny * overlap; out[j].cx += nx * overlap; out[j].cy += ny * overlap; }
          }
        }
      }
    }
    return out.map((m) => ({ ...m, cx: Math.max(-220, Math.min(220, m.cx)), cy: Math.max(-260, Math.min(260, m.cy)) }));
  }, [parties, center, zoom, liveOnly]);

  // Leaflet lifecycle
  useEffect(() => {
    if (!mapElRef.current || leafletRef.current) return;
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapElRef.current || leafletRef.current) return;
      import("leaflet").then((LModule) => {
        if (cancelled || !mapElRef.current || leafletRef.current) return;
        const L: typeof LType = (LModule as unknown as { default?: typeof LType }).default ?? (LModule as unknown as typeof LType);
        const map = L.map(mapElRef.current, {
          center: [center.lat, center.lng], zoom,
          zoomControl: false, attributionControl: true,
          dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
          touchZoom: false, boxZoom: false, keyboard: false,
          fadeAnimation: true, zoomAnimation: true,
        });
        L.tileLayer(CARTO_VOYAGER_URL, { attribution: CARTO_ATTRIBUTION, subdomains: "abcd", maxZoom: 19, crossOrigin: true }).addTo(map);
        map.whenReady(() => { map.invalidateSize(); setMapReady(true); });
        leafletRef.current = map;
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(rafId); if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom, { animate: false });
    const raf = requestAnimationFrame(() => { if (leafletRef.current) leafletRef.current.invalidateSize(); });
    return () => cancelAnimationFrame(raf);
  }, [center.lat, center.lng, zoom]);

  const openParty = (id: string) => { setSelectedPartyId(id); setScreen("detail"); };
  const handleListToggle = () => { setCityFilter(cityFilter); setScreen("home"); };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Your location" }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300_000 },
    );
  };

  const switchCity = (city: string | null) => {
    setCityFilter(city);
    if (city) { const c = CITY_CENTERS[city]; setUserLocation({ ...c, label: city }); }
    else { setUserLocation(null); }
  };

  const liveCount = parties.filter((m) => m.isLive).length;
  const radiusLabel = radius < 1 ? `${radius * 1000}m` : `${radius}km`;
  const mapLinkUrl = buildMapLinkUrl(center.lat, center.lng, zoom);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-2.5 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            className="h-9 w-9 rounded-xl border-white/[0.08] text-white/80"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">Map</h1>
            <p className="truncate text-[11px] text-muted-foreground/50">
              <Navigation className="mr-0.5 inline h-3 w-3 text-purple-400" />
              within {radiusLabel} of {center.label}
              {liveOnly && <> · <span className="text-purple-300">{liveCount} live</span></>}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleListToggle}
            className="gap-1.5 rounded-xl border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-purple-500/30 hover:text-purple-300"
            aria-label="Switch to list view"
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </header>

      {/* Radius + Live filter */}
      <Card className="rounded-none border-x-0 border-t-0 border-white/[0.06] bg-background/50 backdrop-blur-xl">
        <CardContent className="flex items-center gap-2 px-3 py-2">
          <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
            <span className="shrink-0 pr-1 text-[10px] uppercase tracking-wider text-muted-foreground/40">Radius</span>
            {RADII.map((r) => {
              const active = radius === r;
              return (
                <Button
                  key={r}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRadius(r)}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold h-auto",
                    active
                      ? "bg-purple-500/20 text-purple-200 border-purple-500/30 shadow-[0_0_12px_-3px_rgba(83,74,183,0.3)]"
                      : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white/70 hover:border-white/[0.12]"
                  )}
                >
                  {r < 1 ? `${r * 1000}m` : `${r}km`}
                </Button>
              );
            })}
          </div>
          <Button
            variant={liveOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setLiveOnly((v) => !v)}
            aria-pressed={liveOnly}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold h-auto",
              liveOnly
                ? "bg-purple-500/20 text-purple-200 border-purple-500/30 shadow-[0_0_12px_-3px_rgba(83,74,183,0.3)]"
                : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white/70"
            )}
          >
            <Flame className={cn("h-3 w-3", liveOnly && "drop-shadow-[0_0_6px_rgba(83,74,183,0.9)]")} />
            Live
          </Button>
        </CardContent>
      </Card>

      {/* Map canvas */}
      <div className="relative flex-1 overflow-hidden bg-[#1a1a2e] min-h-[360px]">
        <div ref={mapElRef} className="absolute inset-0 z-0 h-full w-full" style={{ pointerEvents: "none" }} aria-hidden="true" />

        {/* Dark vignette overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(83,74,183,0.08) 80%, rgba(0,0,0,0.35) 100%)" }}
          aria-hidden
        />

        {/* Loading shimmer with Skeleton */}
        {!mapReady && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[#1a1a2e]">
            <Card className="border-purple-500/25 bg-black/85 backdrop-blur-sm">
              <CardContent className="flex items-center gap-2 px-4 py-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">Loading map…</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Centered overlay layer */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative h-full w-full max-w-[420px]">
            {/* "You are here" marker */}
            <button
              onClick={useMyLocation}
              className="pointer-events-auto absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              aria-label="Use my location"
            >
              <span className="pointer-events-none absolute h-6 w-6 rounded-full bg-purple-400/40 here-pulse" />
              <span className="pointer-events-none absolute h-10 w-10 rounded-full bg-purple-400/25 here-pulse" style={{ animationDelay: "0.4s" }} />
              <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-purple-400 ring-2 ring-black/60 shadow-[0_0_18px_-2px_rgba(83,74,183,0.95)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="pointer-events-none mt-1.5 whitespace-nowrap rounded-lg border border-purple-500/30 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-purple-300 backdrop-blur-sm">
                {locating ? "Locating…" : "You"}
              </span>
            </button>

            {/* Party pins */}
            {projectedParties.map((m) => {
              const tier = FUN_TIER_META[m.tier];
              const vibes = parseVibes(m.party.vibes);
              const emoji = vibes[0] ? (VIBE_EMOJI[vibes[0]] ?? "✨") : "✨";
              const isHovered = hoveredId === m.party.id;
              const sizePx = m.tier === "lit" ? 44 : m.tier === "lively" ? 40 : m.tier === "warm" ? 36 : 32;

              return (
                <button
                  key={m.party.id}
                  onClick={() => openParty(m.party.id)}
                  onMouseEnter={() => setHoveredId(m.party.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(m.party.id)}
                  onBlur={() => setHoveredId(null)}
                  className={cn("pointer-events-auto group absolute left-1/2 top-1/2 z-10 flex flex-col items-center transition-opacity", m.dimmed && "opacity-40")}
                  style={{ transform: `translate(calc(-50% + ${m.cx}px), calc(-50% + ${m.cy}px - 100%))` }}
                  aria-label={`${m.party.title} — ${m.dist.toFixed(1)}km — ${tier.label}${m.isLive ? " — live now" : ""}`}
                >
                  {/* Lit-tier sparkle ring */}
                  {m.tier === "lit" && (
                    <span
                      className="pointer-events-none absolute -top-1 h-14 w-14 rounded-full border border-purple-300/40 fun-sparkle-ring"
                      style={{ background: "conic-gradient(from 0deg, transparent 0%, rgba(127,119,221,0.40) 25%, transparent 50%, rgba(127,119,221,0.40) 75%, transparent 100%)" }}
                    />
                  )}

                  {/* Lit-tier spark particles */}
                  {m.tier === "lit" && (
                    <>
                      <span className={cn("pointer-events-none absolute -top-2 left-1 h-1 w-1 rounded-full fun-spark", tier.sparkClass)} style={{ "--dx": "-6px", "--dy": "-14px" } as React.CSSProperties} />
                      <span className={cn("pointer-events-none absolute -top-1 right-1 h-1 w-1 rounded-full fun-spark", tier.sparkClass)} style={{ "--dx": "6px", "--dy": "-12px", animationDelay: "0.3s" } as React.CSSProperties} />
                      <span className={cn("pointer-events-none absolute top-2 left-3 h-0.5 w-0.5 rounded-full fun-spark", tier.sparkClass)} style={{ "--dx": "0px", "--dy": "-18px", animationDelay: "0.6s" } as React.CSSProperties} />
                    </>
                  )}

                  {/* The pin */}
                  <span
                    className={cn(
                      "relative flex items-center justify-center rounded-full border-2 border-black/80 shadow-[0_3px_10px_-1px_rgba(0,0,0,0.45)]",
                      m.isLive ? "bg-purple-400" : "bg-purple-500/80",
                      tier.animClass,
                      tier.glowClass,
                      m.isLive && "ring-2 ring-purple-400 ring-offset-1 ring-offset-black/40",
                    )}
                    style={{ height: sizePx, width: sizePx }}
                  >
                    <span className="pointer-events-none absolute inset-1 rounded-full bg-white/20" />
                    <span className="relative text-base leading-none drop-shadow">{emoji}</span>
                    <Badge
                      variant="outline"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1 py-0 text-[8px] font-bold backdrop-blur-sm h-auto"
                    >
                      {m.dist < 1 ? `${Math.round(m.dist * 1000)}m` : `${m.dist.toFixed(1)}k`}
                    </Badge>
                  </span>

                  {/* Hovered tooltip */}
                  {isHovered && (
                    <Card className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-44 -translate-x-1/2 border-white/[0.08] bg-black/90 backdrop-blur-xl animate-pop-in rounded-xl shadow-lg">
                      <CardContent className="px-2.5 py-2">
                        <span className="block max-w-[160px] truncate font-display text-[11px] font-bold text-white">{m.party.title}</span>
                        <span className={cn("mt-0.5 flex items-center gap-1 text-[9px] font-bold", tier.textClass)}>
                          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", tier.dotClass)} />
                          {tier.label} · {m.score}/100
                        </span>
                        <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <span className={cn("block h-full rounded-full", TIER_BAR[m.tier])} style={{ width: `${m.score}%` }} />
                        </span>
                        <span className="mt-1 block text-[9px] text-white/50">
                          {m.dist < 1 ? `${Math.round(m.dist * 1000)}m away` : `${m.dist.toFixed(1)}km away`}
                          {m.isLive && <span className="ml-1 text-purple-300">· Live</span>}
                        </span>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pin tail */}
                  <span className="block -mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-black/80 bg-purple-500/80" aria-hidden />
                </button>
              );
            })}

            {/* Loading overlay */}
            {isLoading && mapReady && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
                <Card className="border-purple-500/25 bg-black/85 backdrop-blur-sm">
                  <CardContent className="flex items-center gap-2 px-3 py-1.5">
                    <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
                    <span className="text-[11px] text-purple-300">Scanning the area…</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Open in Google Maps */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="absolute right-3 top-3 z-20 gap-1.5 rounded-xl border-purple-500/30 bg-black/85 text-[11px] font-bold text-purple-300 backdrop-blur-sm hover:border-purple-400 hover:text-purple-200"
        >
          <a
            href={mapLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Maps
          </a>
        </Button>

        {/* Error overlay */}
        {isError && !isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't scan the area"
              description="Something went wrong fetching nearby parties."
              action={
                <Button
                  onClick={() => refetch()}
                  className="gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-bold text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && parties.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <EmptyState
              icon={MapPin}
              title="No parties nearby"
              description={
                radius <= 2
                  ? "Try widening the radius."
                  : liveOnly
                    ? "Toggle off Live to see all upcoming parties."
                    : "Be the first — launch a vibe."
              }
              action={
                <Button
                  onClick={() => liveOnly ? setLiveOnly(false) : setScreen("create")}
                  className="rounded-xl bg-purple-500 px-4 py-2 text-xs font-bold text-white"
                >
                  {liveOnly ? "Show all parties" : "Launch a vibe"}
                </Button>
              }
            />
          </div>
        )}

        {/* Floating controls */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={useMyLocation}
            disabled={locating}
            className="h-11 w-11 rounded-xl border-white/[0.08] bg-black/70 text-purple-400 backdrop-blur-xl hover:border-purple-500/30 disabled:opacity-70"
            aria-label="Use my GPS location"
          >
            {locating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
          </Button>
          <div className="no-scrollbar flex max-w-[260px] items-center gap-1.5 overflow-x-auto">
            <CityDot label="India" active={!userLocation && !cityFilter} onClick={() => switchCity(null)} />
            {CITIES.map((c) => (
              <CityDot key={c} label={c} active={userLocation?.label === c || cityFilter === c} onClick={() => switchCity(c)} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <section className="relative z-10 mb-20 flex max-h-[34vh] flex-col border-t border-white/[0.06] bg-background/80 backdrop-blur-2xl">
        <div className="absolute -top-px left-0 right-0 h-px bg-purple-500/30" aria-hidden />
        <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-white/20" />

        <div className="flex items-center justify-between px-4 pb-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-purple-300">Nearby parties</h2>
            <Badge variant="outline" className="rounded-lg bg-purple-500/15 border-purple-500/25 text-[10px] font-bold text-purple-300">
              {parties.length}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground/50">sorted by distance</span>
        </div>

        <div className="fancy-scrollbar flex-1 min-h-0 space-y-2 overflow-y-auto overflow-x-hidden px-3 pb-6">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          )}
          {!isLoading && !isError && parties.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No parties to list — try widening the radius.</p>
          )}
          {!isLoading && parties.length > 0 && projectedParties.map((m) => {
            const tier = FUN_TIER_META[m.tier];
            const vibes = parseVibes(m.party.vibes);
            const emoji = vibes[0] ? (VIBE_EMOJI[vibes[0]] ?? "✨") : "✨";
            const isHovered = hoveredId === m.party.id;
            return (
              <button
                key={m.party.id}
                onClick={() => openParty(m.party.id)}
                onMouseEnter={() => setHoveredId(m.party.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition",
                  "border-white/[0.06] bg-white/[0.03] hover:border-purple-500/25 hover:bg-white/[0.06]",
                  isHovered && "border-purple-500/25",
                  m.dimmed && "opacity-40",
                )}
                aria-label={`${m.party.title} — ${m.dist.toFixed(1)}km — ${tier.label}`}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white/[0.04] text-lg",
                    tier.ringClass,
                    tier.glowClass,
                  )}
                >
                  {emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold text-foreground">{m.party.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                    <Badge variant="outline" className={cn("rounded-full px-1.5 py-0.5 font-bold text-[10px] h-auto", tier.chipClass)}>
                      {tier.label}
                    </Badge>
                    {m.isLive && (
                      <span className="flex items-center gap-0.5 font-bold text-purple-300">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                        Live
                      </span>
                    )}
                  </span>
                </span>
                <Badge variant="outline" className={cn("shrink-0 rounded-lg text-[10px] font-bold h-auto py-0.5", tier.chipClass)}>
                  {m.dist < 1 ? `${Math.round(m.dist * 1000)}m` : `${m.dist.toFixed(1)}km`}
                </Badge>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CityDot({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={label} className="flex shrink-0 items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-full transition", active ? "bg-purple-400 scale-110 shadow-[0_0_8px_-2px_rgba(83,74,183,0.6)]" : "bg-white/10 border border-white/20")} />
      {active && <span className="text-[10px] font-bold text-purple-300">{label}</span>}
    </button>
  );
}
