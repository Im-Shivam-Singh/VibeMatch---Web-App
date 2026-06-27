"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { LoginScreen } from "@/screens/login-screen";
import { OnboardingScreen } from "@/screens/onboarding-screen";
import { HomeScreen } from "@/screens/home-screen";
import { CreateScreen } from "@/screens/create-screen";
import { DetailScreen } from "@/screens/detail-screen";
import { InboxScreen } from "@/screens/inbox-screen";
import { ChatScreen } from "@/screens/chat-screen";
import { ProfileScreen } from "@/screens/profile-screen";
import { EditProfileScreen } from "@/screens/edit-profile-screen";
import { MyPartiesScreen } from "@/screens/my-parties-screen";
import { RequestsScreen } from "@/screens/requests-screen";
import { SavedScreen } from "@/screens/saved-screen";
import { MapScreen } from "@/screens/map-screen";
import { TicketsScreen } from "@/screens/tickets-screen";
import { FilterScreen } from "@/screens/filter-screen";
import { CountdownScreen } from "@/screens/countdown-screen";
import { PaymentScreen } from "@/screens/payment-screen";
import { ConfirmationScreen } from "@/screens/confirmation-screen";
import { HostDashboardScreen } from "@/screens/host-dashboard-screen";
import { ManagePartyScreen } from "@/screens/manage-party-screen";
import { AdminScreen } from "@/screens/admin-screen";
import { GroupChatScreen } from "@/screens/group-chat-screen";
import { MusicPlayerBar } from "@/components/vibe/music-player";

export function AppShell() {
  const screen = useAppStore((s) => s.screen);
  const authed = useAppStore((s) => s.authed);
  const onboarded = useAppStore((s) => s.onboarded);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  // If not authed, force login screen
  useEffect(() => {
    if (!authed && screen !== "login") {
      setScreen("login");
    }
  }, [authed, screen, setScreen]);

  // ── Validate the persisted user on app load ──────────────────────
  // If the user ID in localStorage is stale (e.g. DB was reset between
  // sessions), the server will 404 on getUser. We log the user out so
  // they re-authenticate cleanly instead of hitting foreign-key errors
  // on every order/ticket/request mutation.
  useEffect(() => {
    if (!authed || !currentUser?.id) return;
    let cancelled = false;
    api
      .getUser({ id: currentUser.id })
      .then(() => {
        // user exists — nothing to do
      })
      .catch(() => {
        if (cancelled) return;
        useAppStore.getState().logout();
      });
    return () => {
      cancelled = true;
    };
  }, [authed, currentUser?.id]);

  // After auth (incl. rehydration from persist), if still on login screen, route correctly.
  useEffect(() => {
    if (authed && screen === "login") {
      setScreen(onboarded ? "home" : "onboarding");
    }
  }, [authed, screen, onboarded, setScreen]);

  // After auth but before onboarding, show onboarding (unless already done)
  useEffect(() => {
    if (authed && !onboarded && screen === "home") {
      setScreen("onboarding");
    }
  }, [authed, onboarded, screen, setScreen]);

  const current = !authed ? "login" : screen;

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile/tablet */}
      <SidebarNav />

      {/* Main content area — shifts right on desktop to make room for sidebar */}
      <div className="lg:pl-[280px]">
        <main className="relative mx-auto min-h-[100dvh] max-w-6xl flex-col overflow-hidden pb-20 lg:pb-0">
          {/* keyed by current screen so the transition re-fires on screen change */}
          <div key={current} className="h-full animate-screen-in">
            {current === "login" && <LoginScreen />}
            {current === "onboarding" && <OnboardingScreen />}
            {current === "home" && <HomeScreen />}
            {current === "create" && <CreateScreen />}
            {current === "detail" && <DetailScreen />}
            {current === "inbox" && <InboxScreen />}
            {current === "chat" && <ChatScreen />}
            {current === "profile" && <ProfileScreen />}
            {current === "edit-profile" && <EditProfileScreen />}
            {current === "my-parties" && <MyPartiesScreen />}
            {current === "requests" && <RequestsScreen />}
            {current === "saved" && <SavedScreen />}
            {current === "map" && <MapScreen />}
            {current === "tickets" && <TicketsScreen />}
            {current === "filter" && <FilterScreen />}
            {current === "countdown" && <CountdownScreen />}
            {current === "payment" && <PaymentScreen />}
            {current === "confirmation" && <ConfirmationScreen />}
            {current === "host-dashboard" && <HostDashboardScreen />}
            {current === "manage-party" && <ManagePartyScreen />}
            {current === "admin" && <AdminScreen />}
            {current === "group-chat" && <GroupChatScreen />}
          </div>
        </main>
      </div>

      {/* Music player bar */}
      <MusicPlayerBar />

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
