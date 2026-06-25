// Client-side API helpers for VibeMatch.
import type {
  Party,
  PartyCreateInput,
  JoinRequestInput,
  ChatThread,
  ChatMessage,
  VibeUser,
} from "@/lib/types";

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // parties
  listParties: (params: { city?: string | null; vibe?: string | null; q?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.city) sp.set("city", params.city);
    if (params.vibe) sp.set("vibe", params.vibe);
    if (params.q) sp.set("q", params.q);
    const qs = sp.toString();
    return jfetch<{ parties: Party[] }>(`/api/parties${qs ? `?${qs}` : ""}`);
  },
  getParty: (id: string) =>
    jfetch<{ party: Party; host?: VibeUser; vibes: string[]; requests?: any[] }>(
      `/api/parties/${id}`,
    ),
  createParty: (input: PartyCreateInput) =>
    jfetch<{ party: Party }>(`/api/parties`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // requests
  sendRequest: (input: JoinRequestInput) =>
    jfetch<{ id: string; message: string; status: string }>(`/api/requests`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listRequests: (partyId: string) =>
    jfetch<{ requests: any[] }>(`/api/requests?partyId=${partyId}`),

  // threads
  listThreads: (userId: string) =>
    jfetch<{ threads: ChatThread[] }>(`/api/threads?userId=${userId}`),
  getThread: (id: string, userId: string) =>
    jfetch<{
      thread: ChatThread;
      otherUser: VibeUser | null;
      messages: ChatMessage[];
    }>(`/api/threads/${id}?userId=${userId}`),
  ensureThread: (userAId: string, userBId: string, partyId?: string) =>
    jfetch<{ threadId: string; created: boolean }>(`/api/threads`, {
      method: "POST",
      body: JSON.stringify({ userAId, userBId, partyId }),
    }),

  // messages (fallback persistence)
  sendMessage: (input: {
    threadId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }) =>
    jfetch<ChatMessage>(`/api/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // users
  getUser: (by: { phone?: string; id?: string }) => {
    const sp = new URLSearchParams();
    if (by.phone) sp.set("phone", by.phone);
    if (by.id) sp.set("id", by.id);
    return jfetch<{ user: VibeUser }>(`/api/users?${sp.toString()}`);
  },
  updateUser: (id: string, patch: Partial<VibeUser>) =>
    jfetch<{ user: VibeUser }>(`/api/users?id=${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // auth
  sendOtp: (phone: string) =>
    jfetch<{ sent: boolean; devOtp: string }>(`/api/auth/otp`, {
      method: "POST",
      body: JSON.stringify({ step: "send", phone }),
    }),
  verifyOtp: (phone: string, otp: string, name?: string) =>
    jfetch<{ user: VibeUser; token: string }>(`/api/auth/otp`, {
      method: "POST",
      body: JSON.stringify({ step: "verify", phone, otp, name }),
    }),
};
