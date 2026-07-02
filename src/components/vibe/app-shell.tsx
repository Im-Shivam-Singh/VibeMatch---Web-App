"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

// ── Ordered screen list for direction detection ────────────────────────────
// Higher index = "further forward". Moving to a higher index = slide-in from
// right (forward). Moving to a lower index = slide-in from left (back).
const SCREEN_ORDER: string[] = [
  "login",
  "onboarding",
  "home",
  "filter",
  "map",
  "saved",
  "detail",
  "inbox",
  "chat",
  "group-chat",
  "tickets",
  "payment",
  "confirmation",
  "countdown",
  "profile",
  "edit-profile",
  "my-parties",
  "host-dashboard",
  "manage-party",
  "requests",
  "create",
  "admin",
];

function screenIndex(s: string): number {
  const i = SCREEN_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

// ── Transition variants ────────────────────────────────────────────────────
const slideDuration = 0.2;

const variantsForward = {
  initial: { x: 60, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

const variantsBack = {
  initial: { x: -60, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 40, opacity: 0 },
};

const transition = {
  type: "tween" as const,
  ease: "easeOut" as [number, number, number, number],
  duration: slideDuration,
};

// ── Main AppShell ──────────────────────────────────────────────────────────
export function AppShell() {
  const screen = useAppStore((s) => s.screen);
  const prevScreen = useAppStore((s) => s.prevScreen);
  const authed = useAppStore((s) => s.authed);
  const onboarded = useAppStore((s) => s.onboarded);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  // Track direction for animation — derived directly from store values
  const isForward =
    !prevScreen || screenIndex(screen) >= screenIndex(prevScreen);

  // If not authed, force login screen
  useEffect(() => {
    if (!authed && screen !== "login") {
      setScreen("login");
    }
  }, [authed, screen, setScreen]);

  // Validate persisted user on app load
  useEffect(() => {
    if (!authed || !currentUser?.id) return;
    let cancelled = false;
    api
      .getUser({ id: currentUser.id })
      .then(() => {
        // user exists
      })
      .catch(() => {
        if (cancelled) return;
        useAppStore.getState().logout();
      });
    return () => {
      cancelled = true;
    };
  }, [authed, currentUser?.id]);

  // After auth, route away from login
  useEffect(() => {
    if (authed && screen === "login") {
      setScreen(onboarded ? "home" : "onboarding");
    }
  }, [authed, screen, onboarded, setScreen]);

  // After auth but before onboarding, show onboarding
  useEffect(() => {
    if (authed && !onboarded && screen === "home") {
      setScreen("onboarding");
    }
  }, [authed, onboarded, screen, setScreen]);

  const current = !authed ? "login" : screen;

  // Determine whether nav should be visible
  const showNav = authed && current !== "login" && current !== "onboarding";

  // Pick transition direction
  const v = isForward ? variantsForward : variantsBack;

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile/tablet */}
      <SidebarNav />

      {/* Main content area — shifts right on desktop to make room for sidebar */}
      <div className="lg:pl-[280px]">
        <main
          className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col overflow-hidden"
          style={{
            paddingBottom: showNav
              ? "calc(5rem + env(safe-area-inset-bottom, 0px))"
              : 0,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={v.initial}
              animate={v.animate}
              exit={v.exit}
              transition={transition}
              className="flex flex-1 flex-col"
            >
              <ScreenContent screen={current} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Music player bar — only when nav visible (i.e. not auth flows) */}
      {showNav && <MusicPlayerBar />}

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
