"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "./bottom-nav";
import { LoginScreen } from "@/screens/login-screen";
import { HomeScreen } from "@/screens/home-screen";
import { CreateScreen } from "@/screens/create-screen";
import { DetailScreen } from "@/screens/detail-screen";
import { InboxScreen } from "@/screens/inbox-screen";
import { ChatScreen } from "@/screens/chat-screen";
import { ProfileScreen } from "@/screens/profile-screen";
import { EditProfileScreen } from "@/screens/edit-profile-screen";
import { MyPartiesScreen } from "@/screens/my-parties-screen";
import { RequestsScreen } from "@/screens/requests-screen";

export function AppShell() {
  const screen = useAppStore((s) => s.screen);
  const authed = useAppStore((s) => s.authed);
  const setScreen = useAppStore((s) => s.setScreen);

  // If not authed, force login screen
  useEffect(() => {
    if (!authed && screen !== "login") {
      setScreen("login");
    }
  }, [authed, screen, setScreen]);

  const current = !authed ? "login" : screen;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
      <main className="relative flex-1 overflow-hidden pb-28">
        {current === "login" && <LoginScreen />}
        {current === "home" && <HomeScreen />}
        {current === "create" && <CreateScreen />}
        {current === "detail" && <DetailScreen />}
        {current === "inbox" && <InboxScreen />}
        {current === "chat" && <ChatScreen />}
        {current === "profile" && <ProfileScreen />}
        {current === "edit-profile" && <EditProfileScreen />}
        {current === "my-parties" && <MyPartiesScreen />}
        {current === "requests" && <RequestsScreen />}
      </main>
      <BottomNav />
    </div>
  );
}
