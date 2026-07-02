import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Party, PartyMedia } from "@/models";

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

  await connectDB();

  // Position = current count so new items append to the end.
  const count = await PartyMedia.countDocuments({ partyId });
  // If the party has no cover yet, set it from this first media item.
  const party = await Party.findById(partyId).lean({ virtuals: true });
  const media = await PartyMedia.create({
    partyId,
    url,
    type,
    caption: caption ?? "",
    position: count,
  });
  if (party && !party.coverUrl) {
    await Party.findByIdAndUpdate(partyId, { $set: { coverUrl: url } });
  }
  return NextResponse.json(
    {
      media: {
        id: media.id ?? media._id?.toString(),
        partyId: media.partyId,
        url: media.url,
        type: media.type === "video" ? "video" : "image",
        caption: media.caption,
        position: media.position,
        createdAt: media.createdAt?.toISOString?.() ?? String(media.createdAt ?? ""),
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

  await connectDB();

  const existing = await PartyMedia.findById(mediaId).lean({ virtuals: true });
  if (!existing || existing.partyId !== partyId) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const wasCoverUrl = existing.url;
  await PartyMedia.findByIdAndDelete(mediaId);
  // If we removed the cover, promote the next media item (if any) to cover.
  const party = await Party.findById(partyId).lean({ virtuals: true });
  if (party && party.coverUrl === wasCoverUrl) {
    const next = await PartyMedia.find({ partyId })
      .sort({ position: 1 })
      .limit(1)
      .lean({ virtuals: true });
    await Party.findByIdAndUpdate(partyId, {
      $set: { coverUrl: next[0]?.url ?? null },
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

  await connectDB();

  const party = await Party.findByIdAndUpdate(
    partyId,
    { $set: { groupChatEnabled: body.groupChatEnabled } },
    { new: true },
  ).lean({ virtuals: true });
  return NextResponse.json({
    party: {
      id: party?.id ?? party?._id?.toString(),
      groupChatEnabled: party?.groupChatEnabled,
    },
  });
}
