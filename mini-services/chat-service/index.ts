import { createServer } from "http";
import { Server } from "socket.io";

// VibeMatch chat service — real-time 1:1 messaging relay.
// Persists nothing itself; the Next.js app persists via /api/messages.
// Port 3003 (Caddy forwards via ?XTransformPort=3003, path "/").

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Map userId -> Set<socketId> (a user may have multiple tabs/devices)
const userSockets = new Map<string, Set<string>>();

function joinUser(userId: string, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socketId);
}
function leaveUser(userId: string, socketId: string) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}
function emitToUser(userId: string, event: string, payload: unknown) {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const sid of set) io.to(sid).emit(event, payload);
}

io.on("connection", (socket) => {
  let currentUserId: string | null = null;

  socket.on("identify", (data: { userId: string }) => {
    currentUserId = data.userId;
    joinUser(currentUserId, socket.id);
    socket.emit("identified", { ok: true });
  });

  // A client sends a chat message. Payload mirrors /api/messages body.
  // We persist via the Next API is the client's responsibility (or we can do it here).
  // For simplicity the client POSTs to /api/messages AND emits "chat:message".
  socket.on(
    "chat:message",
    (data: {
      threadId: string;
      senderId: string;
      receiverId: string;
      content: string;
      createdAt: string;
      id?: string;
    }) => {
      // echo back to sender
      socket.emit("chat:message", data);
      // deliver to receiver if online
      emitToUser(data.receiverId, "chat:message", data);
      // typing indicators & read receipts handled below
    },
  );

  socket.on(
    "chat:typing",
    (data: { threadId: string; toUserId: string; isTyping: boolean }) => {
      emitToUser(data.toUserId, "chat:typing", {
        threadId: data.threadId,
        isTyping: data.isTyping,
      });
    },
  );

  socket.on(
    "chat:read",
    (data: { threadId: string; byUserId: string }) => {
      // notify the other participant that messages were read
      // (we don't know sender here; client includes byUserId = reader)
      // We broadcast read receipts to all sockets except sender.
      io.emit("chat:read", data);
    },
  );

  socket.on("disconnect", () => {
    if (currentUserId) leaveUser(currentUserId, socket.id);
  });

  socket.on("error", (err) => {
    console.error("socket error", err);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`VibeMatch chat service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
