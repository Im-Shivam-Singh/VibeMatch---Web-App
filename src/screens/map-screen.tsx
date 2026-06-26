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
} from "lucide-react";
// Leaflet's CSS import is SSR-safe (Next.js just bundles the stylesheet).
import "leaflet/dist/leaflet.css";
// Type-only import — gives us L.Map / L.TileLayer types at compile time
// without pulling Leaflet's runtime (which touches `window` at module load
// and would crash SSR). The actual runtime import happens lazily inside
// useEffect below.
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
import { EmptyState } from "@/components/vibe/empty-state";
import { cn } from "@/lib/utils";

const RADII = [1, 2, 5, 10, 25] as const;
type Radius = (typeof RADII)[number];

// Leaflet zoom per radius — picked so the active radius comfortably fills the
// visible map area without cropping nearby pins. These map roughly to the
// Google Maps zoom levels users expect at each scale.
const RADIUS_ZOOM: Record<Radius, number> = {
  1: 15, // street-level
  2: 14,
  5: 13, // neighbourhood
  10: 12,
  25: 10, // citywide
};

// CARTO Voyager basemap — a free, no-API-key tile layer that looks close to
// Google Maps' default style (clean roads, parks, water, labels). It's served
// from Carto's public CDN with generous rate limits for non-commercial use.
// We fall back to OSM Standard tiles if Voyager ever fails.
const CARTO_VOYAGER_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Solid yellow bar for the tooltip's fun-score progress (Bumble = single accent).
const TIER_BAR: Record<FunTier, string> = {
  low: "bg-yellow-400",
  warm: "bg-yellow-400",
  lively: "bg-yellow-400",
  lit: "bg-yellow-400",
};

/**
 * Web Mercator projection — convert a (lat,lng) to a pixel offset relative to
 * a center point, at the given zoom. This matches what Leaflet/CARTO tiles
 * use, so overlay pins align perfectly with the underlying tile grid.
 *
 * Returns pixel offsets from the center, so the overlay layer (positioned at
 * the center of the canvas) can place each pin with translate(cx, cy).
 */
function latLngToContainerPixel(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
): { x: number; y: number } {
  const tileSize = 256;
  const worldSize = tileSize * Math.pow(2, zoom);
  const toWorld = (la: number, ln: number) => {
    const latRad = (la * Math.PI) / 180;
    const x = ((ln + 180) / 360) * worldSize;
    const y =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      worldSize;
    return { x, y };
  };
  const c = toWorld(centerLat, centerLng);
  const p = toWorld(lat, lng);
  return { x: p.x - c.x, y: p.y - c.y };
}

// Build a regular Google Maps URL for the "Open in Google Maps" button so
// users can pan/zoom/get-directions in a real Google Maps tab.
function buildMapLinkUrl(lat: number, lng: number, zoom: number) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(
    6,
  )}&z=${zoom}`;
}

// Projected party ready to render on the map.
interface ProjectedParty {
  party: Party;
  coords: { lat: number; lng: number };
  dist: number;
  score: number;
  tier: FunTier;
  isLive: boolean;
  dimmed: boolean;
  cx: number; // pixel offset from canvas center (Web Mercator-aligned)
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

  // Local state — radius (km) + live-only filter (now DIMS instead of hides).
  const [radius, setRadius] = useState<Radius>(5);
  const [liveOnly, setLiveOnly] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Refs — the DOM container div + the Leaflet map instance.
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LType.Map | null>(null);

  // Resolve the map center: stored user location > city center > India mid.
  const center = useMemo<{ lat: number; lng: number; label: string }>(() => {
    if (userLocation) return userLocation;
    if (cityFilter && CITY_CENTERS[cityFilter]) {
      return { ...CITY_CENTERS[cityFilter], label: cityFilter };
    }
    return { lat: 20.5937, lng: 78.9629, label: "India" };
  }, [userLocation, cityFilter]);

  const zoom = RADIUS_ZOOM[radius];

  // Proximity query — fetches all parties within `radius` km of `center`.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["parties", "near", center.lat, center.lng, radius, cityFilter],
    queryFn: () =>
      api.listPartiesNear({
        lat: center.lat,
        lng: center.lng,
        radiusKm: radius,
        city: cityFilter ?? undefined,
      }),
    staleTime: 30_000,
  });

  const allParties = data?.parties ?? [];

  // Compute distance + fun score for each party. We KEEP non-live parties
  // in the list (rather than filtering them out) so the live-only toggle
  // can DIM them to 40% opacity instead of hiding them.
  const parties = useMemo<ProjectedParty[]>(() => {
    const withMeta: ProjectedParty[] = allParties.map((p) => {
      const coords = partyCoords(p);
      const dist = haversineKm(center, coords);
      const score = funScore(p);
      const tier = funTier(score);
      const isLive = partyLiveStatus(p.date, p.time) === "live";
      return {
        party: p,
        coords,
        dist,
        score,
        tier,
        isLive,
        dimmed: false,
        cx: 0,
        cy: 0,
      };
    });
    if (liveOnly) {
      return withMeta.sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return a.dist - b.dist;
      });
    }
    return withMeta.sort((a, b) => a.dist - b.dist);
  }, [allParties, center, liveOnly]);

  // Project each party's (lat,lng) to a Web-Mercator pixel offset from the
  // canvas center. Collision-aware jitter prevents dense clusters from
  // overlapping. This projection matches Leaflet's tile grid exactly, so
  // overlay pins sit on the correct street/building in the rendered map.
  const projectedParties = useMemo<ProjectedParty[]>(() => {
    const out = parties.map((m) => {
      const { x, y } = latLngToContainerPixel(
        m.coords.lat,
        m.coords.lng,
        center.lat,
        center.lng,
        zoom,
      );
      // Clamp so pins stay within a reasonable visible range around the center.
      const cx = Math.max(-220, Math.min(220, x));
      const cy = Math.max(-260, Math.min(260, y));
      return {
        ...m,
        cx,
        cy,
        dimmed: liveOnly && !m.isLive,
      };
    });
    const MIN_DIST = 14; // px — minimum separation between pin centers
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const dx = out[j].cx - out[i].cx;
          const dy = out[j].cy - out[i].cy;
          const d = Math.hypot(dx, dy);
          if (d < MIN_DIST) {
            if (d < 0.001) {
              out[j].cx += MIN_DIST;
              out[j].cy += MIN_DIST * 0.4;
            } else {
              const overlap = (MIN_DIST - d) / 2 + 1;
              const nx = dx / d;
              const ny = dy / d;
              out[i].cx -= nx * overlap;
              out[i].cy -= ny * overlap;
              out[j].cx += nx * overlap;
              out[j].cy += ny * overlap;
            }
          }
        }
      }
    }
    return out.map((m) => ({
      ...m,
      cx: Math.max(-220, Math.min(220, m.cx)),
      cy: Math.max(-260, Math.min(260, m.cy)),
    }));
  }, [parties, center, zoom, liveOnly]);

  // ── Leaflet lifecycle ────────────────────────────────────────────────────
  // Mount the Leaflet map ONCE on first render. We disable ALL interactions
  // (drag, zoom, scroll, touch, keyboard) so the map is a pure visual tile
  // layer — our React-rendered yellow overlay pins (positioned via Web
  // Mercator projection) stay perfectly aligned with the tile grid.
  //
  // Leaflet is imported LAZILY here (not at module top-level) because its
  // runtime touches `window` during module evaluation, which would crash SSR.
  // `import("leaflet")` only runs in the browser, inside useEffect.
  //
  // We defer initialization to the next animation frame so the container
  // div has its final computed size before Leaflet reads it. Without this,
  // Leaflet can initialize with size=0 and silently fail to load any tiles.
  // After `whenReady`, we also call `invalidateSize()` as a belt-and-braces
  // measure to handle any late layout shifts.
  //
  // setState (setMapReady) is called inside `whenReady`'s callback — this is
  // "subscribing for updates from an external system" per the lint rule, not
  // a synchronous setState in effect body, so it's allowed.
  useEffect(() => {
    if (!mapElRef.current || leafletRef.current) return;
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapElRef.current || leafletRef.current) return;
      import("leaflet").then((LModule) => {
        if (cancelled || !mapElRef.current || leafletRef.current) return;
        const L: typeof LType =
          (LModule as unknown as { default?: typeof LType }).default ??
          (LModule as unknown as typeof LType);
        const map = L.map(mapElRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          fadeAnimation: true,
          zoomAnimation: true,
        });
        L.tileLayer(CARTO_VOYAGER_URL, {
          attribution: CARTO_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 19,
          crossOrigin: true,
        }).addTo(map);
        map.whenReady(() => {
          // Force Leaflet to re-measure its container — handles any layout
          // shift between init and first paint.
          map.invalidateSize();
          setMapReady(true);
        });
        leafletRef.current = map;
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // When center or zoom changes (radius pill / city switch / GPS), re-center
  // the underlying tile layer. The overlay pins recompute their positions via
  // the projectedParties useMemo, so they follow the new view automatically.
  // We call invalidateSize() after setView to ensure Leaflet re-measures its
  // container and loads the correct tiles for the new viewport.
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom, { animate: false });
    // Defer invalidateSize to the next frame so it runs after setView's
    // internal state update completes.
    const raf = requestAnimationFrame(() => {
      if (leafletRef.current) leafletRef.current.invalidateSize();
    });
    return () => cancelAnimationFrame(raf);
  }, [center.lat, center.lng, zoom]);

  const openParty = (id: string) => {
    setSelectedPartyId(id);
    setScreen("detail");
  };

  const handleListToggle = () => {
    setCityFilter(cityFilter);
    setScreen("home");
  };

  // Best-effort browser geolocation — silent on failure.
  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your location",
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300_000 },
    );
  };

  // City switch — syncs the explore cityFilter so the proximity query
  // doesn't double-filter by an old city.
  const switchCity = (city: string | null) => {
    setCityFilter(city);
    if (city) {
      const c = CITY_CENTERS[city];
      setUserLocation({ ...c, label: city });
    } else {
      setUserLocation(null);
    }
  };

  const liveCount = parties.filter((m) => m.isLive).length;
  const radiusLabel = radius < 1 ? `${radius * 1000}m` : `${radius}km`;
  const mapLinkUrl = buildMapLinkUrl(center.lat, center.lng, zoom);

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Header — slim glass with yellow title + radius summary */}
      <header className="sticky top-0 z-30 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-2.5 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-extrabold leading-tight text-yellow-400">
            Map
          </h1>
          <p className="truncate text-[11px] text-white/50">
            <Navigation className="mr-0.5 inline h-3 w-3 text-yellow-400" />
            within {radiusLabel} of {center.label}
            {liveOnly && (
              <>
                {" · "}
                <span className="text-yellow-400">
                  {liveCount} live
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleListToggle}
          className="flex h-9 items-center gap-1.5 rounded-full glass border border-white/10 px-3 text-xs font-semibold text-white/70 transition hover:border-yellow-400/50 hover:text-yellow-300"
          aria-label="Switch to list view"
        >
          <List className="h-4 w-4" />
          List
        </button>
      </header>

      {/* Radius + Live filter row */}
      <div className="z-20 -mt-px flex items-center gap-2 glass border-b border-white/10 px-3 py-2">
        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 pr-1 text-[10px] uppercase tracking-wider text-white/50">
            Radius
          </span>
          {RADII.map((r) => {
            const active = radius === r;
            return (
              <button
                key={r}
                onClick={() => setRadius(r)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                  active
                    ? "bg-yellow-400 scale-105 text-black"
                    : "glass border border-white/10 text-white/70 hover:border-yellow-400/50 hover:text-yellow-300",
                )}
              >
                {r < 1 ? `${r * 1000}m` : `${r}km`}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setLiveOnly((v) => !v)}
          aria-pressed={liveOnly}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition",
            liveOnly
              ? "bg-yellow-400 vibe-live-ring scale-105 text-black"
              : "glass border border-white/10 text-white/70 hover:border-yellow-400/50 hover:text-yellow-300",
          )}
        >
          <Flame
            className={cn(
              "h-3 w-3",
              liveOnly && "drop-shadow-[0_0_6px_rgba(255,203,5,0.9)]",
            )}
          />
          Live
        </button>
      </div>

      {/* Map canvas — Leaflet (CARTO Voyager tiles) + yellow Bumble overlay pins */}
      <div className="relative flex-1 overflow-hidden bg-[#e8eaed] min-h-[360px]">
        {/* Leaflet container — fills the canvas. The leaflet-pane elements
            inside are pointer-events: none by default at the pane level,
            but tile panes can swallow clicks, so we also set pointer-events:
            none on the wrapper to be safe. Our yellow pins live in a
            separate overlay layer with pointer-events: auto. */}
        <div
          ref={mapElRef}
          className="absolute inset-0 z-0 h-full w-full"
          style={{ pointerEvents: "none" }}
          aria-hidden="true"
        />

        {/* Subtle yellow brand vignette over the realistic map tiles — keeps
            the Bumble aesthetic without obscuring roads/labels. */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(255,203,5,0.05) 80%, rgba(0,0,0,0.30) 100%)",
          }}
          aria-hidden
        />

        {/* Tile loading shimmer — shown until Leaflet fires whenReady. */}
        {!mapReady && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[#e8eaed]">
            <div className="flex items-center gap-2 rounded-full border border-yellow-400/40 bg-black/85 px-4 py-2 text-xs font-semibold text-yellow-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 vibe-pulse text-yellow-400" />
              Loading map…
            </div>
          </div>
        )}

        {/* Centered overlay layer — holds the "You are here" marker + party pins.
            All pins are positioned relative to canvas center using Web Mercator
            pixel offsets (cx, cy) so they align with the tile grid underneath. */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative h-full w-full max-w-[420px]">
            {/* "You are here" marker — sits at exact canvas center (the lat/lng
                we asked Leaflet to centre on). */}
            <button
              onClick={useMyLocation}
              className="pointer-events-auto absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              aria-label="Use my location"
            >
              {/* pulsing rings — pointer-events-none so they don't block pin clicks */}
              <span className="pointer-events-none absolute h-6 w-6 rounded-full bg-yellow-400/40 here-pulse" />
              <span
                className="pointer-events-none absolute h-10 w-10 rounded-full bg-yellow-400/25 here-pulse"
                style={{ animationDelay: "0.4s" }}
              />
              {/* solid yellow disc + white center dot */}
              <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 ring-2 ring-black/60 shadow-[0_0_18px_-2px_rgba(255,203,5,0.95)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="pointer-events-none mt-1.5 whitespace-nowrap rounded-full border border-yellow-400/40 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-yellow-400 backdrop-blur-sm">
                {locating ? "Locating…" : "You"}
              </span>
            </button>

            {/* Party pins — projected (lat,lng)→px + collision-jittered.
                Each pin is positioned with cx/cy pixel offsets from center. */}
            {projectedParties.map((m) => {
              const tier = FUN_TIER_META[m.tier];
              const vibes = parseVibes(m.party.vibes);
              const emoji = vibes[0] ? (VIBE_EMOJI[vibes[0]] ?? "✨") : "✨";
              const isHovered = hoveredId === m.party.id;
              const sizePx =
                m.tier === "lit"
                  ? 44
                  : m.tier === "lively"
                    ? 40
                    : m.tier === "warm"
                      ? 36
                      : 32;

              return (
                <button
                  key={m.party.id}
                  onClick={() => openParty(m.party.id)}
                  onMouseEnter={() => setHoveredId(m.party.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(m.party.id)}
                  onBlur={() => setHoveredId(null)}
                  className={cn(
                    "pointer-events-auto group absolute left-1/2 top-1/2 z-10 flex flex-col items-center transition-opacity",
                    m.dimmed && "opacity-40",
                  )}
                  style={{
                    transform: `translate(calc(-50% + ${m.cx}px), calc(-50% + ${m.cy}px - 100%))`,
                  }}
                  aria-label={`${m.party.title} — ${m.dist.toFixed(1)}km — ${tier.label}${m.isLive ? " — live now" : ""}`}
                >
                  {/* Lit-tier rotating sparkle ring — uniform yellow */}
                  {m.tier === "lit" && (
                    <span
                      className="pointer-events-none absolute -top-1 h-14 w-14 rounded-full border border-yellow-300/40 fun-sparkle-ring"
                      style={{
                        background:
                          "conic-gradient(from 0deg, transparent 0%, rgba(255,203,5,0.40) 25%, transparent 50%, rgba(255,203,5,0.40) 75%, transparent 100%)",
                      }}
                    />
                  )}

                  {/* Lit-tier floating spark particles using tier sparkClass */}
                  {m.tier === "lit" && (
                    <>
                      <span
                        className={cn(
                          "pointer-events-none absolute -top-2 left-1 h-1 w-1 rounded-full fun-spark",
                          tier.sparkClass,
                        )}
                        style={
                          {
                            "--dx": "-6px",
                            "--dy": "-14px",
                          } as React.CSSProperties
                        }
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute -top-1 right-1 h-1 w-1 rounded-full fun-spark",
                          tier.sparkClass,
                        )}
                        style={
                          {
                            "--dx": "6px",
                            "--dy": "-12px",
                            animationDelay: "0.3s",
                          } as React.CSSProperties
                        }
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute top-2 left-3 h-0.5 w-0.5 rounded-full fun-spark",
                          tier.sparkClass,
                        )}
                        style={
                          {
                            "--dx": "0px",
                            "--dy": "-18px",
                            animationDelay: "0.6s",
                          } as React.CSSProperties
                        }
                      />
                    </>
                  )}

                  {/* The pin itself — solid yellow disc with vibe emoji.
                      Black ring + drop shadow helps it pop on the light map tiles. */}
                  <span
                    className={cn(
                      "relative flex items-center justify-center rounded-full border-2 border-black/80 bg-yellow-400 shadow-[0_3px_10px_-1px_rgba(0,0,0,0.45)]",
                      tier.animClass,
                      tier.glowClass,
                      m.isLive && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-black/40",
                    )}
                    style={{ height: sizePx, width: sizePx }}
                  >
                    {/* inner highlight */}
                    <span className="pointer-events-none absolute inset-1 rounded-full bg-white/25" />
                    <span className="relative text-base leading-none drop-shadow">
                      {emoji}
                    </span>
                    {/* distance chip in tier color */}
                    <span
                      className={cn(
                        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1 py-0 text-[8px] font-bold backdrop-blur-sm",
                        tier.chipClass,
                      )}
                    >
                      {m.dist < 1
                        ? `${Math.round(m.dist * 1000)}m`
                        : `${m.dist.toFixed(1)}k`}
                    </span>
                  </span>

                  {/* Hovered/focused tooltip — title + tier label + score bar + distance */}
                  {isHovered && (
                    <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-44 -translate-x-1/2 rounded-xl glass-strong border border-yellow-400/30 px-2.5 py-2 shadow-lg animate-pop-in">
                      <span className="block max-w-[160px] truncate font-display text-[11px] font-bold text-white">
                        {m.party.title}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-[9px] font-bold",
                          tier.textClass,
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            tier.dotClass,
                          )}
                        />
                        {tier.label} · {m.score}/100
                      </span>
                      {/* fun-score progress bar — solid yellow on white/10 track */}
                      <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            TIER_BAR[m.tier],
                          )}
                          style={{ width: `${m.score}%` }}
                        />
                      </span>
                      <span className="mt-1 block text-[9px] text-white/50">
                        {m.dist < 1
                          ? `${Math.round(m.dist * 1000)}m away`
                          : `${m.dist.toFixed(1)}km away`}
                        {m.isLive && (
                          <span className="ml-1 text-yellow-300">· Live</span>
                        )}
                      </span>
                    </span>
                  )}

                  {/* Pin tail — yellow diamond pointing at the exact spot */}
                  <span
                    className="block -mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-black/80 bg-yellow-400"
                    aria-hidden
                  />
                </button>
              );
            })}

            {/* Loading overlay — vibe-pulse on the scanner chip */}
            {isLoading && mapReady && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-full glass border border-yellow-400/30 px-3 py-1.5 text-[11px] text-yellow-300">
                  <Sparkles className="h-3 w-3 vibe-pulse text-yellow-400" />
                  Scanning the area…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* "Open in Google Maps" floating button — top-right of map.
            Opens a real Google Maps tab so users can pan/zoom/get-directions
            on the same center+zoom the radar is showing. */}
        <a
          href={mapLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 top-3 z-20 flex h-9 items-center gap-1.5 rounded-full border border-yellow-400/40 bg-black/85 px-3 text-[11px] font-bold text-yellow-300 backdrop-blur-sm transition hover:border-yellow-400 hover:text-yellow-200"
          aria-label="Open in Google Maps (full interactive view)"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Maps
        </a>

        {/* Error overlay */}
        {isError && !isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <EmptyState
              icon={MapPin}
              title="Couldn't scan the area"
              description="Something went wrong fetching nearby parties."
              action={
                <button
                  onClick={() => refetch()}
                  className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition active:scale-95"
                >
                  Retry
                </button>
              }
            />
          </div>
        )}

        {/* Empty state — floating 🗺️ + yellow title + hint to widen radius */}
        {!isLoading && !isError && parties.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-3 rounded-3xl glass border border-yellow-400/30 px-6 py-8 text-center">
              <span className="text-4xl vibe-float" aria-hidden>
                🗺️
              </span>
              <h3 className="font-display text-base font-extrabold text-yellow-400">
                No parties nearby
              </h3>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                {radius <= 2
                  ? "Try widening the radius — your scene is just out of frame."
                  : liveOnly
                    ? "Toggle off Live to see all upcoming parties on the radar."
                    : "Be the first — launch a vibe and it'll pop up on the radar."}
              </p>
              <button
                onClick={() =>
                  liveOnly ? setLiveOnly(false) : setScreen("create")
                }
                className="rounded-full bg-yellow-400 px-4 py-2 text-xs font-bold text-black transition active:scale-95"
              >
                {liveOnly ? "Show all parties" : "Launch a vibe"}
              </button>
            </div>
          </div>
        )}

        {/* Floating "use my location" + city switcher */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="flex h-11 w-11 items-center justify-center rounded-full glass-strong border border-white/10 text-yellow-400 transition hover:border-yellow-400/50 disabled:opacity-70"
            aria-label="Use my GPS location"
          >
            {locating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-yellow-400 vibe-pulse animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
          </button>
          <div className="no-scrollbar flex max-w-[260px] items-center gap-1.5 overflow-x-auto">
            <CityDot
              label="India"
              active={!userLocation && !cityFilter}
              onClick={() => switchCity(null)}
            />
            {CITIES.map((c) => (
              <CityDot
                key={c}
                label={c}
                active={userLocation?.label === c || cityFilter === c}
                onClick={() => switchCity(c)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom sheet — glass-strong with solid yellow top accent + drag handle */}
      <section className="glass-strong relative z-10 mb-20 flex max-h-[34vh] flex-col border-t border-white/10">
        {/* Solid yellow top accent line */}
        <div className="absolute -top-px left-0 right-0 h-px bg-yellow-400" aria-hidden />
        {/* Drag handle — short solid bar */}
        <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-white/30" />

        <div className="flex items-center justify-between px-4 pb-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-extrabold text-yellow-400">
              Nearby parties
            </h2>
            <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
              {parties.length}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            sorted by distance
          </span>
        </div>

        <div className="fancy-scrollbar flex-1 space-y-2 overflow-y-auto px-3 pb-6">
          {/* Loading skeleton rows */}
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl border border-white/10 vibe-skeleton"
                />
              ))}
            </div>
          )}

          {!isLoading && parties.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No parties to list — try widening the radius.
            </p>
          )}

          {!isLoading &&
            parties.length > 0 &&
            projectedParties.map((m) => {
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
                    "relative flex w-full items-center gap-3 overflow-hidden rounded-2xl glass border px-3 py-2.5 text-left transition",
                    "border-white/10 hover:border-yellow-400/50",
                    isHovered && "border-yellow-400/50",
                    m.dimmed && "opacity-40",
                  )}
                  aria-label={`${m.party.title} — ${m.dist.toFixed(1)}km — ${tier.label}`}
                >
                  {/* left yellow accent bar on hover */}
                  <span
                    className={cn(
                      "absolute left-0 top-0 h-full w-1 bg-yellow-400 transition-opacity",
                      isHovered ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  {/* vibe emoji in tier-colored ring */}
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-card/60 text-lg",
                      tier.ringClass,
                      tier.glowClass,
                    )}
                  >
                    {emoji}
                  </span>
                  {/* title + meta */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold text-white">
                      {m.party.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 font-bold",
                          tier.chipClass,
                        )}
                      >
                        {tier.label}
                      </span>
                      {m.isLive && (
                        <span className="flex items-center gap-0.5 font-bold text-yellow-300">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400 vibe-pulse" />
                          Live
                        </span>
                      )}
                    </span>
                  </span>
                  {/* distance chip */}
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      tier.chipClass,
                    )}
                  >
                    {m.dist < 1
                      ? `${Math.round(m.dist * 1000)}m`
                      : `${m.dist.toFixed(1)}km`}
                  </span>
                </button>
              );
            })}
        </div>
      </section>
    </div>
  );
}

// City switcher — small dot with yellow fill + label appearing when active.
function CityDot({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5"
    >
      <span
        className={cn(
          "h-3 w-3 rounded-full transition",
          active
            ? "bg-yellow-400 scale-110"
            : "glass border border-white/20",
        )}
      />
      {active && (
        <span className="text-[10px] font-bold text-yellow-400">
          {label}
        </span>
      )}
    </button>
  );
}
