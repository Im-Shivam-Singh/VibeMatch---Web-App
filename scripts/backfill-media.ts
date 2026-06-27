import { db } from "@/lib/db";

// Backfill PartyMedia for already-seeded parties so the new gallery UI has
// something to render without re-seeding from scratch. Idempotent — skips
// parties that already have any media rows.

const COVERS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483452389744-eaaf621f05cb?w=800&q=80&auto=format&fit=crop",
];

async function main() {
  const parties = await db.party.findMany({
    include: { media: true },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  let added = 0;
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    if (p.media.length > 0) continue;

    const coverIdx = i % COVERS.length;
    const items: Array<{
      partyId: string;
      url: string;
      type: "image" | "video";
      caption: string;
      position: number;
    }> = [
      {
        partyId: p.id,
        url: p.coverUrl || COVERS[coverIdx],
        type: "image",
        caption: "",
        position: 0,
      },
      {
        partyId: p.id,
        url: COVERS[(coverIdx + 1) % COVERS.length],
        type: "image",
        caption: "",
        position: 1,
      },
    ];

    // First party gets a video too.
    if (i === 0) {
      items.push({
        partyId: p.id,
        url: "https://videos.pexels.com/video-files/2022395/2022395-uhd_3840_2160_24fps.mp4",
        type: "video",
        caption: "Vibe from last session",
        position: 2,
      });
    }

    await db.partyMedia.createMany({ data: items });
    added += items.length;
    console.log(`Backfilled ${items.length} media for "${p.title}" (${p.id})`);
  }

  console.log(`Done. Inserted ${added} media rows across ${parties.length} parties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
