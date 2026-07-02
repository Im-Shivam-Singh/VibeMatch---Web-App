// Client-side API helpers for VibeMatch.
import type {
  Party,
  PartyCreateInput,
  JoinRequestInput,
  ChatThread,
  ChatMessage,
  VibeUser,
  PartyReview,
  HostAnalytics,
  MenuItem,
  Order,
  Ticket,
  GroupChat,
  GroupChatMessage,
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
  listParties: (params: { city?: string | null; vibe?: string | null; q?: string; profession?: string | null } = {}) => {
    const sp = new URLSearchParams();
    if (params.city) sp.set("city", params.city);
    if (params.vibe) sp.set("vibe", params.vibe);
    if (params.q) sp.set("q", params.q);
    if (params.profession) sp.set("profession", params.profession);
    const qs = sp.toString();
    return jfetch<{ parties: Party[] }>(`/api/parties${qs ? `?${qs}` : ""}`);
  },
  // parties within a radius of a lat/lng — used by the map view
  listPartiesNear: (params: {
    lat: number;
    lng: number;
    radiusKm: number;
    city?: string | null;
  }) => {
    const sp = new URLSearchParams();
    sp.set("lat", String(params.lat));
    sp.set("lng", String(params.lng));
    sp.set("radiusKm", String(params.radiusKm));
    if (params.city) sp.set("city", params.city);
    return jfetch<{ parties: Party[] }>(`/api/parties?${sp.toString()}`);
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
    jfetch<{ id: string; message: string; status: string; threadId?: string }>(`/api/requests`, {
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
      request?: {
        id: string;
        partyId: string;
        requesterId?: string | null;
        requesterName: string;
        status: "pending" | "accepted" | "rejected";
        threadId?: string | null;
        introVideoUrl?: string | null;
        introVideoPoster?: string | null;
        createdAt: string;
      } | null;
      paid?: boolean;
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
  verifyOtp: (phone: string, otp: string, name?: string, role?: 'host' | 'partier') =>
    jfetch<{ user: VibeUser; token: string }>(`/api/auth/otp`, {
      method: "POST",
      body: JSON.stringify({ step: "verify", phone, otp, name, role }),
    }),

  // saved parties (server-side)
  listSaved: (userId: string) =>
    jfetch<{ saved: any[]; partyIds: string[] }>(`/api/saved?userId=${userId}`),
  toggleSaved: (userId: string, partyId: string) =>
    jfetch<{ saved: boolean; partyId: string }>(`/api/saved`, {
      method: "POST",
      body: JSON.stringify({ userId, partyId }),
    }),

  // party views
  recordView: (partyId: string, userId?: string) =>
    jfetch<{ recorded: boolean }>(`/api/views`, {
      method: "POST",
      body: JSON.stringify({ partyId, userId }),
    }),

  // host analytics
  getHostAnalytics: (hostId: string) =>
    jfetch<HostAnalytics>(`/api/analytics?hostId=${hostId}`),

  // reviews
  listReviews: (partyId: string) =>
    jfetch<{ reviews: PartyReview[]; avgRating: number; count: number }>(
      `/api/reviews?partyId=${partyId}`,
    ),
  submitReview: (input: {
    partyId: string;
    userId: string;
    rating: number;
    comment: string;
  }) =>
    jfetch<{ review: PartyReview }>(`/api/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // "For You" personalized feed
  forYou: (userId: string) =>
    jfetch<{ parties: Party[]; matchedVibes: string[] }>(
      `/api/parties/for-you?userId=${userId}`,
    ),

  // accept/reject a join request
  updateRequest: (id: string, status: "accepted" | "rejected") =>
    jfetch<{ id: string; status: string }>(`/api/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // ===== Group chat (unlocked after first payment) =====
  // GET /api/group-chats?partyId=...&userId=... → returns the group chat for a
  // party (members + messages). Returns 404 if the group chat isn't enabled
  // yet (no paid guests).
  getGroupChat: (partyId: string, userId: string) =>
    jfetch<{ groupChat: GroupChat }>(
      `/api/group-chats?partyId=${partyId}&userId=${userId}`,
    ),
  // POST /api/group-chats — send a text message to the group chat
  sendGroupMessage: (groupChatId: string, senderId: string, content: string) =>
    jfetch<{ message: GroupChatMessage }>(`/api/group-chats`, {
      method: "POST",
      body: JSON.stringify({ groupChatId, senderId, content }),
    }),

  // ===== Host manage-party: menu + media CRUD (after creation) =====
  addMenuItem: (input: {
    partyId: string;
    name: string;
    price: number;
    emoji: string;
    category: "drink" | "snack" | "soft";
  }) =>
    jfetch<{ item: MenuItem }>(`/api/menus`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteMenuItem: (id: string) =>
    jfetch<{ id: string }>(`/api/menus/${id}`, { method: "DELETE" }),

  // Add a media item (image/video URL) to an existing party's gallery.
  addPartyMedia: (partyId: string, item: { url: string; type: "image" | "video"; caption?: string }) =>
    jfetch<{ media: any }>(`/api/parties/${partyId}/media`, {
      method: "POST",
      body: JSON.stringify(item),
    }),
  // Remove a media item by id
  deletePartyMedia: (partyId: string, mediaId: string) =>
    jfetch<{ id: string }>(`/api/parties/${partyId}/media?id=${mediaId}`, {
      method: "DELETE",
    }),
  // Toggle group-chat-enabled flag (host manual control from manage-party)
  setGroupChatEnabled: (partyId: string, enabled: boolean) =>
    jfetch<{ party: Party }>(`/api/parties/${partyId}/media`, {
      method: "PATCH",
      body: JSON.stringify({ groupChatEnabled: enabled }),
    }),

  // menu items for a party
  listMenu: (partyId: string) =>
    jfetch<{ items: MenuItem[] }>(`/api/menus?partyId=${partyId}`),

  // orders
  listOrders: (by: { userId?: string; partyId?: string }) => {
    const sp = new URLSearchParams();
    if (by.userId) sp.set("userId", by.userId);
    if (by.partyId) sp.set("partyId", by.partyId);
    return jfetch<{ orders: Order[] }>(`/api/orders?${sp.toString()}`);
  },
  createOrder: (input: {
    userId: string;
    partyId: string;
    items: {
      menuItemId?: string;
      name: string;
      emoji: string;
      unitPrice: number;
      quantity: number;
    }[];
  }) =>
    jfetch<{ order: Order; ticket: Ticket }>(`/api/orders`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // tickets
  listTickets: (userId: string) =>
    jfetch<{ tickets: Ticket[] }>(`/api/tickets?userId=${userId}`),

  // ===== Guest TRUST ratings (host → guest) =====
  getTrustRatings: (guestId: string) =>
    jfetch<{
      ratings: any[];
      trustScore: number;
      trustCount: number;
    }>(`/api/trust-ratings?guestId=${guestId}`),
  createTrustRating: (input: {
    partyId: string;
    hostId: string;
    guestId: string;
    rating: number;
    note?: string;
  }) =>
    jfetch<{ trust: any; trustScore: number }>(`/api/trust-ratings`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ===== Media uploads (host photos + videos for a party) =====
  // Posts a multipart/form-data payload to /api/upload. Returns one entry
  // per file with a { url, type, name, size } shape. `onProgress` is optional
  // and reports 0..100 for the current upload (used by the create-screen
  // progress bar). We use a raw fetch + XMLHttpRequest wrapper because the
  // native fetch API doesn't expose upload progress events.
  uploadMedia: (
    files: File[],
    onProgress?: (pct: number) => void,
  ): Promise<{
    files: { url: string; type: "image" | "video"; name: string; size: number }[];
  }> =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      for (const f of files) fd.append("file", f, f.name);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.responseType = "json";
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as any);
        } else {
          const msg =
            (xhr.response && xhr.response.error) ||
            `Upload failed (${xhr.status})`;
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(fd);
    }),
};
