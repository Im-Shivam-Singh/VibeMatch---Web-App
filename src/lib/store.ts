"use client";

import { create } from "zustand";
import type { Screen, VibeUser } from "@/lib/types";

interface AppState {
  // auth
  authed: boolean;
  currentUser: VibeUser | null;
  setAuthed: (v: boolean) => void;
  setCurrentUser: (u: VibeUser | null) => void;
  login: (u: VibeUser) => void;
  logout: () => void;

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

  // filters on explore
  cityFilter: string | null;
  setCityFilter: (c: string | null) => void;
  vibeFilter: string | null;
  setVibeFilter: (v: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // toast for request sent etc (lightweight)
  openCreate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  authed: false,
  currentUser: null,
  setAuthed: (v) => set({ authed: v }),
  setCurrentUser: (u) => set({ currentUser: u }),
  login: (u) => set({ authed: true, currentUser: u, screen: "home" }),
  logout: () =>
    set({
      authed: false,
      currentUser: null,
      screen: "login",
      selectedPartyId: null,
      selectedThreadId: null,
    }),

  screen: "login",
  prevScreen: null,
  setScreen: (s) =>
    set((state) => ({
      prevScreen: state.screen,
      screen: s,
    })),
  goBack: () =>
    set((state) => ({
      screen: state.prevScreen ?? "home",
      prevScreen: null,
    })),

  selectedPartyId: null,
  setSelectedPartyId: (id) => set({ selectedPartyId: id }),
  selectedThreadId: null,
  setSelectedThreadId: (id) => set({ selectedThreadId: id }),

  cityFilter: null,
  setCityFilter: (c) => set({ cityFilter: c }),
  vibeFilter: null,
  setVibeFilter: (v) => set({ vibeFilter: v }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  openCreate: () =>
    set((state) => ({ prevScreen: state.screen, screen: "create" })),
}));
