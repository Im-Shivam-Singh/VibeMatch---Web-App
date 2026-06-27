import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── /api/parties/[id]/media ───────────────────────────────────────────
// Host manage-party endpoints for the live event gallery + group-chat toggle.

// POST — add a media item (image/video URL) to the party's gallery.
// Body: { url, type: "image"|"video", caption? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: partyId } = await params;
  let body: { url: string; type: "image" | "video"; caption?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { url, type, caption } = body;
  if (!url || (type !== "image" && type !== "video")) {
    return NextResponse.json(
      { error: "url and type ('image'|'video') are required" },
      { status: 400 },
    );
  }
  // Position = current max + 1 so new items append to the end.
  const count = await db.partyMedia.count({ where: { partyId } });
  // If the party has no cover yet, set it from this first media item.
  const party = await db.party.findUnique({ where: { id: partyId } });
  const media = await db.partyMedia.create({
    data: {
      partyId,
      url,
      type,
      caption: caption ?? "",
      position: count,
    },
  });
  if (party && !party.coverUrl) {
    await db.party.update({
      where: { id: partyId },
      data: { coverUrl: url },
    });
  }
  return NextResponse.json(
    {
      media: {
        id: media.id,
        partyId: media.partyId,
        url: media.url,
        type: media.type === "video" ? "video" : "image",
        caption: media.caption,
        position: media.position,
        createdAt: media.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

// DELETE — remove a media item by id (?id=...). Re-syncs the cover if the
// removed item was the cover.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: partyId } = await params;
  const mediaId = new URL(req.url).searchParams.get("id");
  if (!mediaId) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }
  const existing = await db.partyMedia.findUnique({ where: { id: mediaId } });
  if (!existing || existing.partyId !== partyId) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const wasCoverUrl = existing.url;
  await db.partyMedia.delete({ where: { id: mediaId } });
  // If we removed the cover, promote the next media item (if any) to cover.
  const party = await db.party.findUnique({
    where: { id: partyId },
    include: { media: { orderBy: { position: "asc" } } },
  });
  if (party && party.coverUrl === wasCoverUrl) {
    const next = party.media[0];
    await db.party.update({
      where: { id: partyId },
      data: { coverUrl: next?.url ?? null },
    });
  }
  return NextResponse.json({ id: mediaId });
}

// PATCH — toggle the group-chat-enabled flag (host manual control).
// Body: { groupChatEnabled: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: partyId } = await params;
  let body: { groupChatEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.groupChatEnabled !== "boolean") {
    return NextResponse.json(
      { error: "groupChatEnabled (boolean) is required" },
      { status: 400 },
    );
  }
  const party = await db.party.update({
    where: { id: partyId },
    data: { groupChatEnabled: body.groupChatEnabled },
  });
  return NextResponse.json({
    party: {
      id: party.id,
      groupChatEnabled: party.groupChatEnabled,
    },
  });
}
