import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { Party, PartyMedia } from "@/lib/db/models";

// POST /api/cleanup — Clean up media for ended events older than 1 week
// This can be called by a cron job or manually
async function _POST(req: NextRequest) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Find all parties that ended more than 1 week ago
  // A party "ends" on its date + 4 hours after start time
  const parties = await Party.find({}).lean({ virtuals: true });

  const endedParties = parties.filter((p) => {
    const endDate = new Date(`${p.date}T${p.time || "23:59"}:00`);
    endDate.setHours(endDate.getHours() + 4);
    return endDate < oneWeekAgo;
  });

  let mediaDeleted = 0;
  let partiesCleaned = 0;

  for (const party of endedParties) {
    const pid = party.id ?? party._id?.toString();
    if (!pid) continue;
    // Check if already cleaned
    if ((party as any).mediaCleaned) continue;

    // Delete all media for this party
    const result = await PartyMedia.deleteMany({ partyId: pid });
    mediaDeleted += result.deletedCount;

    // Mark party as cleaned and set the message
    await Party.findByIdAndUpdate(pid, {
      $set: {
        mediaCleaned: true,
        cleanedAt: new Date().toISOString(),
        cleanedMessage:
          "Media files cleaned after 1 week post-event. Storage optimized.",
      },
    });

    partiesCleaned++;
  }

  return NextResponse.json({
    success: true,
    partiesCleaned,
    mediaDeleted,
    message: `Cleaned ${mediaDeleted} media files from ${partiesCleaned} ended events`,
  });
}

// GET /api/cleanup?partyId=... — Check cleanup status for a specific party
async function _GET(req: NextRequest) {
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (partyId) {
    const party = await Party.findById(partyId).lean({ virtuals: true });
    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      partyId,
      mediaCleaned: (party as any).mediaCleaned ?? false,
      cleanedAt: (party as any).cleanedAt ?? null,
      cleanedMessage: (party as any).cleanedMessage ?? null,
    });
  }

  // Return general cleanup stats
  const totalParties = await Party.countDocuments({});
  const cleanedParties = await Party.countDocuments({
    mediaCleaned: true,
  } as any);

  return NextResponse.json({
    totalParties,
    cleanedParties,
    pendingCleanup: totalParties - cleanedParties,
  });
}

export const POST = withDB(_POST);
export const GET = withDB(_GET);
