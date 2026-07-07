"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Screen, VibeUser } from "@/lib/types";

interface AppState {
  // auth
  authed: boolean;
  currentUser: VibeUser | null;
  userRole: 'host' | 'partier';
  setAuthed: (v: boolean) => void;
  setCurrentUser: (u: VibeUser | null) => void;
  setUserRole: (r: 'host' | 'partier') => void;
  login: (u: VibeUser) => void;
  logout: () => void;

  // onboarding
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  // navigation
  screen: Screen;
  prevScreen: Screen | null;
  setScreen: (s: Screen) => void;
  goBack: () => void;

  // context ids
  selectedPartyId: string | null;
  setSelectedPartyId: (id: string | null) => void;
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  // new: the last-created order id (for the confirmation screen)
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;

  // filters on explore
  cityFilter: string | null;
  setCityFilter: (c: string | null) => void;
  vibeFilter: string | null;
  setVibeFilter: (v: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // "Who are you?" profession filter — drives host-crowd matching.
  professionFilter: string | null;
  setProfessionFilter: (p: string | null) => void;
  // Nearby radius (km) — when > 0 and a city is selected, the home feed
  // filters parties within this radius of the city center.
  radiusKm: number;
  setRadiusKm: (km: number) => void;

  // saved/liked parties (persisted)
  savedPartyIds: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;

  // explore: "all" | "saved" quick scope
  exploreScope: "all" | "saved";
  setExploreScope: (s: "all" | "saved") => void;

  // user location for the map view — defaults to city center; can be
  // overridden with the browser geolocation API.
  userLocation: { lat: number; lng: number; label: string } | null;
  setUserLocation: (loc: { lat: number; lng: number; label: string } | null) => void;

  openCreate: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      authed: false,
      currentUser: null,
      userRole: 'partier',
      setAuthed: (v) => set({ authed: v }),
      setCurrentUser: (u) => set((state) => ({ currentUser: u, userRole: u?.role ?? state.userRole })),
      setUserRole: (r) => set({ userRole: r }),
      login: (u) => set({ authed: true, currentUser: u, userRole: u.role ?? 'partier', screen: "home" }),
      logout: () =>
        set({
          authed: false,
          currentUser: null,
          userRole: 'partier',
          screen: "login",
          selectedPartyId: null,
          selectedThreadId: null,
        }),

      onboarded: false,
      setOnboarded: (v) => set({ onboarded: v }),

      screen: "login",
      prevScreen: null,
      setScreen: (s) =>
        set((state) => ({ prevScreen: state.screen, screen: s })),
      goBack: () =>
        set((state) => ({
          screen: state.prevScreen ?? "home",
          prevScreen: null,
        })),

      selectedPartyId: null,
      setSelectedPartyId: (id) => set({ selectedPartyId: id }),
      selectedThreadId: null,
      setSelectedThreadId: (id) => set({ selectedThreadId: id }),
      selectedOrderId: null,
      setSelectedOrderId: (id) => set({ selectedOrderId: id }),

      cityFilter: null,
      setCityFilter: (c) => set({ cityFilter: c }),
      vibeFilter: null,
      setVibeFilter: (v) => set({ vibeFilter: v }),
      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),
      professionFilter: null,
      setProfessionFilter: (p) => set({ professionFilter: p }),
      radiusKm: 10,
      setRadiusKm: (km) => set({ radiusKm: Math.max(0, Math.min(50, km)) }),

      savedPartyIds: [],
      toggleSaved: (id) =>
        set((state) => ({
          savedPartyIds: state.savedPartyIds.includes(id)
            ? state.savedPartyIds.filter((x) => x !== id)
            : [...state.savedPartyIds, id],
        })),
      isSaved: (id) => get().savedPartyIds.includes(id),

      exploreScope: "all",
      setExploreScope: (s) => set({ exploreScope: s }),

      userLocation: null,
      setUserLocation: (loc) => set({ userLocation: loc }),

      openCreate: () =>
        set((state) => ({ prevScreen: state.screen, screen: "create" })),
    }),
    {
      name: "vibematch-store",
      storage: createJSONStorage(() => localStorage),
      // only persist these slices (not transient nav state)
      partialize: (state) => ({
        savedPartyIds: state.savedPartyIds,
        onboarded: state.onboarded,
        currentUser: state.currentUser,
        authed: state.authed,
        userRole: state.userRole,
        cityFilter: state.cityFilter,
        radiusKm: state.radiusKm,
        userLocation: state.userLocation,
        professionFilter: state.professionFilter,
      }),
    },
  ),
);
