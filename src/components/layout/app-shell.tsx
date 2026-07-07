"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { LoginScreen } from "@/features/auth/screens/login-screen";
import { OnboardingScreen } from "@/features/auth/screens/onboarding-screen";
import { HomeScreen } from "@/features/party/screens/home-screen";
import { CreateScreen } from "@/features/party/screens/create-screen";
import { DetailScreen } from "@/features/party/screens/detail-screen";
import { InboxScreen } from "@/features/chat/screens/inbox-screen";
import { ChatScreen } from "@/features/chat/screens/chat-screen";
import { ProfileScreen } from "@/features/profile/screens/profile-screen";
import { EditProfileScreen } from "@/features/profile/screens/edit-profile-screen";
import { MyPartiesScreen } from "@/features/host/screens/my-parties-screen";
import { RequestsScreen } from "@/features/host/screens/requests-screen";
import { SavedScreen } from "@/features/party/screens/saved-screen";
import { MapScreen } from "@/features/party/screens/map-screen";
import { TicketsScreen } from "@/features/tickets/screens/tickets-screen";
import { FilterScreen } from "@/features/party/screens/filter-screen";
import { CountdownScreen } from "@/features/party/screens/countdown-screen";
import { PaymentScreen } from "@/features/tickets/screens/payment-screen";
import { ConfirmationScreen } from "@/features/tickets/screens/confirmation-screen";
import { HostDashboardScreen } from "@/features/host/screens/host-dashboard-screen";
import { ManagePartyScreen } from "@/features/host/screens/manage-party-screen";
import { AdminScreen } from "@/features/admin/screens/admin-screen";
import { GroupChatScreen } from "@/features/chat/screens/group-chat-screen";
import { MusicPlayerBar } from "@/components/party/music-player";

// ── Screen renderer map ────────────────────────────────────────────────────
function ScreenContent({ screen }: { screen: string }) {
  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "onboarding":
      return <OnboardingScreen />;
    case "home":
      return <HomeScreen />;
    case "create":
      return <CreateScreen />;
    case "detail":
      return <DetailScreen />;
    case "inbox":
      return <InboxScreen />;
    case "chat":
      return <ChatScreen />;
    case "profile":
      return <ProfileScreen />;
    case "edit-profile":
      return <EditProfileScreen />;
    case "my-parties":
      return <MyPartiesScreen />;
    case "requests":
      return <RequestsScreen />;
    case "saved":
      return <SavedScreen />;
    case "map":
      return <MapScreen />;
    case "tickets":
      return <TicketsScreen />;
    case "filter":
      return <FilterScreen />;
    case "countdown":
      return <CountdownScreen />;
    case "payment":
      return <PaymentScreen />;
    case "confirmation":
      return <ConfirmationScreen />;
    case "host-dashboard":
      return <HostDashboardScreen />;
    case "manage-party":
      return <ManagePartyScreen />;
    case "admin":
      return <AdminScreen />;
    case "group-chat":
      return <GroupChatScreen />;
    default:
      return <HomeScreen />;
  }
}

// ── Loading Screen Component ────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading VibeMatch...</p>
        </div>
      </div>
    </div>
  );
}

// ── Main AppShell ──────────────────────────────────────────────────────────
export function AppShell() {
  const screen = useAppStore((s) => s.screen);
  const authed = useAppStore((s) => s.authed);
  const onboarded = useAppStore((s) => s.onboarded);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  // Invalidate queries when screen changes so fresh data is fetched on tab switch
  const qc = useQueryClient();

  useEffect(() => {
    switch (screen) {
      case "home":
        qc.invalidateQueries({ queryKey: ["parties"] });
        qc.invalidateQueries({ queryKey: ["parties-for-you"] });
        break;
      case "tickets":
        qc.invalidateQueries({ queryKey: ["tickets"] });
        break;
      case "inbox":
        qc.invalidateQueries({ queryKey: ["threads"] });
        break;
      case "profile":
        qc.invalidateQueries({ queryKey: ["user"] });
        break;
      case "saved":
        qc.invalidateQueries({ queryKey: ["saved"] });
        break;
      case "my-parties":
        qc.invalidateQueries({ queryKey: ["my-parties"] });
        break;
      case "host-dashboard":
        qc.invalidateQueries({ queryKey: ["analytics"] });
        break;
    }
  }, [screen, qc]);

  // Track initialization state for auth check
  const [isInitializing, setIsInitializing] = useState(true);
  const hasCheckedAuth = useRef(false);

  // Validate persisted user on app load - runs once
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // If no persisted auth, immediately finish initialization
    if (!authed || !currentUser?.id) {
      // Use setTimeout to defer setState outside the effect
      const timer = setTimeout(() => setIsInitializing(false), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    api
      .getUser({ id: currentUser.id })
      .then(() => {
        if (cancelled) return;
        // User exists and is valid, finish initialization
        setIsInitializing(false);
      })
      .catch(() => {
        if (cancelled) return;
        // User is invalid, logout and finish initialization
        useAppStore.getState().logout();
        setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  // If not authed, force login screen
  useEffect(() => {
    if (isInitializing) return;
    if (!authed && screen !== "login") {
      setScreen("login");
    }
  }, [isInitializing, authed, screen, setScreen]);

  // After auth, route away from login
  useEffect(() => {
    if (isInitializing) return;
    if (authed && screen === "login") {
      setScreen(onboarded ? "home" : "onboarding");
    }
  }, [isInitializing, authed, screen, onboarded, setScreen]);

  // After auth but before onboarding, show onboarding
  useEffect(() => {
    if (isInitializing) return;
    if (authed && !onboarded && screen === "home") {
      setScreen("onboarding");
    }
  }, [isInitializing, authed, onboarded, screen, setScreen]);

  // Show loading screen while checking auth
  if (isInitializing) {
    return <LoadingScreen />;
  }

  const current = !authed ? "login" : screen;

  // Determine whether nav should be visible
  const showNav = authed && current !== "login" && current !== "onboarding";

  // Login and onboarding screens should be full-width centered
  const isAuthFlow = current === "login" || current === "onboarding";

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto bg-background">
      {/* Desktop sidebar — hidden on mobile/tablet and during auth flow */}
      {!isAuthFlow && <SidebarNav />}

      {/* Main content area */}
      <div className={isAuthFlow ? "" : "lg:pl-[280px]"}>
        <main
          className={cn(
            "relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-background",
            isAuthFlow
              ? "items-center justify-center"
              : "max-w-2xl mx-auto lg:max-w-6xl"
          )}
          style={{
            paddingBottom: showNav
              ? "calc(5rem + env(safe-area-inset-bottom, 0px))"
              : 0,
          }}
        >
          <div
            key={current}
            className={cn(
              "flex flex-1 flex-col",
              isAuthFlow && "w-full max-w-md mx-auto"
            )}
          >
            <ScreenContent screen={current} />
          </div>
        </main>
      </div>

      {/* Music player bar — only when nav visible (i.e. not auth flows) */}
      {showNav && <MusicPlayerBar />}

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
