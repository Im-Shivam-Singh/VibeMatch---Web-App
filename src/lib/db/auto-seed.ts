/**
 * Auto-seed module — seeds the in-memory MongoDB with demo data
 * the first time the app starts. Only runs for local/in-memory DBs.
 */

import mongoose from "mongoose";
import {
  User,
  Party,
  JoinRequest,
  Review,
  PartyView,
  ChatThread,
  Message,
  MenuItem,
  Order,
  Ticket,
  SavedParty,
  TrustRating,
} from "@/lib/db/models";

let seeded = false;

function relDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const DEMO_USERS = [
  {
    phone: "+447700900001",
    name: "Aaditya Rao",
    username: "aaditya",
    bio: "Flat parties in Leith · R&B and hip-hop 🎵",
    city: "Edinburgh",
    profession: "Software eng.",
    instagram: "aaditya.nights",
    vibes: 64,
    hosted: 6,
    rating: 4.9,
    ratingCount: 18,
    vibePrefs: "R&B,Chill",
    role: "host" as const,
  },
  {
    phone: "+447700900002",
    name: "Priya Sharma",
    username: "priya",
    bio: "Games nights + boardgame evenings in Newington 🎮",
    city: "Edinburgh",
    profession: "Designer",
    instagram: "priya.games",
    vibes: 52,
    hosted: 4,
    rating: 4.8,
    ratingCount: 11,
    vibePrefs: "Games,Chill",
    role: "host" as const,
  },
  {
    phone: "+447700900003",
    name: "Raj Malhotra",
    username: "raj",
    bio: "Bollywood nights + dancing in Marchmont 🌿",
    city: "Edinburgh",
    profession: "Finance",
    instagram: "raj.bollywood",
    vibes: 41,
    hosted: 0,
    rating: 4.7,
    ratingCount: 9,
    vibePrefs: "Bollywood,Chill",
    role: "partier" as const,
  },
  {
    phone: "+447700900004",
    name: "Jamie Thompson",
    username: "jamie",
    bio: "Lo-fi & chill · London rooftops 🌙",
    city: "London",
    profession: "Healthcare",
    instagram: "jamie.lofi",
    vibes: 88,
    hosted: 11,
    rating: 5.0,
    ratingCount: 26,
    vibePrefs: "Lo-fi,Chill",
    role: "host" as const,
  },
  {
    phone: "+447700900005",
    name: "Maya Khan",
    username: "maya",
    bio: "Retro + vinyl nights in Manchester 📼",
    city: "Manchester",
    profession: "Student",
    instagram: "maya.vinyl",
    vibes: 35,
    hosted: 5,
    rating: 4.6,
    ratingCount: 12,
    vibePrefs: "Retro,EDM",
    role: "host" as const,
  },
  {
    phone: "+447700900006",
    name: "Sam Wilson",
    username: "sam",
    bio: "Student · always down for a flat party 🍻",
    city: "Edinburgh",
    profession: "Student",
    vibes: 9,
    hosted: 1,
    rating: 5.0,
    ratingCount: 2,
    vibePrefs: "Games,Chill",
    role: "partier" as const,
  },
  {
    phone: "+447700900007",
    name: "You",
    username: "you",
    bio: "Just here for the vibes ✨",
    city: "Edinburgh",
    profession: "Student",
    vibes: 12,
    hosted: 0,
    rating: 5.0,
    ratingCount: 3,
    vibePrefs: "Techno,Chill",
    role: "partier" as const,
  },
];

const DEMO_PARTIES = [
  {
    slug: "party_rnb_leith",
    title: "Aaditya's flat party",
    city: "Edinburgh",
    area: "Leith, Edinburgh",
    date: relDate(3),
    time: "21:00",
    fee: 7,
    maxGuests: 15,
    vibes: "R&B,Chill",
    description:
      "R&B night at mine — slow jams, good drinks, and a proper flat session. Small group, good chat, music till late.",
    hostName: "Aaditya Rao",
    hostIndex: 0,
    lat: 55.9667,
    lng: -3.1739,
    guestCount: 8,
    locationRevealHoursBefore: 3,
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    menu: [
      { name: "Jack Daniels shot", price: 2, emoji: "🥃", category: "drink" },
      { name: "Small Norfolk can", price: 1, emoji: "🍺", category: "drink" },
      { name: "Nachos plate", price: 4, emoji: "🍟", category: "snack" },
      { name: "Soft drink", price: 1.5, emoji: "🥤", category: "soft" },
    ],
  },
  {
    slug: "party_games_newington",
    title: "Priya's games night",
    city: "Edinburgh",
    area: "Newington, Edinburgh",
    date: relDate(2),
    time: "20:00",
    fee: 5,
    maxGuests: 12,
    vibes: "Games,Chill",
    description:
      "Boardgames + chill. Catan, Codenames, and maybe a round of Cards Against Humanity. Bring your A-game.",
    hostName: "Priya Sharma",
    hostIndex: 1,
    lat: 55.9467,
    lng: -3.1832,
    guestCount: 5,
    locationRevealHoursBefore: 3,
    spotifyPlaylistUrl: "",
    menu: [
      { name: "Craft beer can", price: 2, emoji: "🍺", category: "drink" },
      { name: "Crisps bowl", price: 1, emoji: "🥨", category: "snack" },
      { name: "Soft drink", price: 1, emoji: "🥤", category: "soft" },
    ],
  },
  {
    slug: "party_bollywood_marchmont",
    title: "Raj's Bollywood night",
    city: "Edinburgh",
    area: "Marchmont, Edinburgh",
    date: relDate(3),
    time: "22:00",
    fee: 6,
    maxGuests: 13,
    vibes: "Bollywood",
    description:
      "Bollywood + Punjabi beats all night. Dancing mandatory. Come for the music, stay for the samosas.",
    hostName: "Raj Malhotra",
    hostIndex: 2,
    lat: 55.9389,
    lng: -3.1933,
    guestCount: 11,
    locationRevealHoursBefore: 3,
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DWSV3Tk4GO2fq",
    menu: [
      { name: "Kingfisher can", price: 2, emoji: "🍺", category: "drink" },
      { name: "Samosa plate", price: 3, emoji: "🥟", category: "snack" },
      { name: "Mango lassi", price: 2, emoji: "🥤", category: "soft" },
    ],
  },
  {
    slug: "party_lofi_london",
    title: "Jamie's rooftop lo-fi",
    city: "London",
    area: "Shoreditch, London",
    date: relDate(5),
    time: "19:30",
    fee: 9,
    maxGuests: 20,
    vibes: "Lo-fi,Chill",
    description:
      "Sunset lo-fi on a Shoreditch rooftop. Vinyl + chill beats, blankets, and a great view. Bring a jumper.",
    hostName: "Jamie Thompson",
    hostIndex: 3,
    lat: 51.5258,
    lng: -0.0777,
    guestCount: 14,
    locationRevealHoursBefore: 6,
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4o1oenSJRJd",
    menu: [
      { name: "Craft lager", price: 3, emoji: "🍺", category: "drink" },
      { name: "Olives bowl", price: 3, emoji: "🫒", category: "snack" },
      { name: "Soft drink", price: 2, emoji: "🥤", category: "soft" },
    ],
  },
  {
    slug: "party_retro_manchester",
    title: "Maya's vinyl retro night",
    city: "Manchester",
    area: "Northern Quarter, Manchester",
    date: relDate(7),
    time: "20:00",
    fee: 5,
    maxGuests: 18,
    vibes: "Retro,EDM",
    description:
      "Spin the wax — 80s and 90s retro on actual vinyl. Northern Quarter studio space, proper sound system.",
    hostName: "Maya Khan",
    hostIndex: 4,
    lat: 53.4839,
    lng: -2.2333,
    guestCount: 6,
    locationRevealHoursBefore: 4,
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4o1oenSJRJd",
    menu: [
      { name: "Gin & tonic", price: 4, emoji: "🍸", category: "drink" },
      { name: "Cheese board", price: 5, emoji: "🧀", category: "snack" },
      { name: "Soft drink", price: 2, emoji: "🥤", category: "soft" },
    ],
  },
  {
    slug: "party_games_delhi",
    title: "Sam's Games Night",
    city: "Delhi",
    area: "Hauz Khas, Delhi",
    date: relDate(4),
    time: "21:00",
    fee: 3,
    maxGuests: 16,
    vibes: "Games,Chill",
    description:
      "Board games & card games night in Hauz Khas. We've got the games, you bring the energy!",
    hostName: "Sam Wilson",
    hostIndex: 5,
    lat: 28.5494,
    lng: 77.2001,
    guestCount: 10,
    locationRevealHoursBefore: 3,
    spotifyPlaylistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    menu: [
      { name: "Ice bucket", price: 1, emoji: "🧊", category: "soft" },
      { name: "Mixers set", price: 2, emoji: "🥤", category: "soft" },
      { name: "Chips bowl", price: 1, emoji: "🥨", category: "snack" },
    ],
  },
];

const DEMO_JOIN_REQUESTS = [
  { partySlug: "party_rnb_leith", requesterName: "Sam Wilson", requesterIndex: 5, introMessage: "Hey! R&B is my vibe 🎵", status: "accepted" },
  { partySlug: "party_rnb_leith", requesterName: "You", requesterIndex: 6, introMessage: "First flat party in Edinburgh — excited!", status: "accepted" },
  { partySlug: "party_rnb_leith", requesterName: "Raj Malhotra", requesterIndex: 2, introMessage: "Can I DJ? Got the best R&B playlist 🔥", status: "pending" },
  { partySlug: "party_games_newington", requesterName: "You", requesterIndex: 6, introMessage: "Love Catan! Happy to bring snacks 🍕", status: "accepted" },
  { partySlug: "party_games_newington", requesterName: "Raj Malhotra", requesterIndex: 2, introMessage: "Board game night sounds perfect", status: "accepted" },
  { partySlug: "party_games_newington", requesterName: "Aaditya Rao", requesterIndex: 0, introMessage: "Count me in — I'm a Codenames champion 💪", status: "pending" },
  { partySlug: "party_bollywood_marchmont", requesterName: "Sam Wilson", requesterIndex: 5, introMessage: "Bollywood night?! I'm SO there 💃", status: "accepted" },
  { partySlug: "party_bollywood_marchmont", requesterName: "You", requesterIndex: 6, introMessage: "Never been to a Bollywood party!", status: "pending" },
  { partySlug: "party_lofi_london", requesterName: "Aaditya Rao", requesterIndex: 0, introMessage: "Visiting London — rooftop vibes yes please!", status: "accepted" },
  { partySlug: "party_lofi_london", requesterName: "You", requesterIndex: 6, introMessage: "Lo-fi + rooftop = dream night", status: "pending" },
  { partySlug: "party_retro_manchester", requesterName: "Jamie Thompson", requesterIndex: 3, introMessage: "Retro vinyl? I have some 80s records 📼", status: "accepted" },
  { partySlug: "party_retro_manchester", requesterName: "Sam Wilson", requesterIndex: 5, introMessage: "Manchester road trip! What's the dress code?", status: "pending" },
  { partySlug: "party_games_delhi", requesterName: "Raj Malhotra", requesterIndex: 2, introMessage: "Hauz Khas nights are the best 🎲", status: "accepted" },
  { partySlug: "party_games_delhi", requesterName: "Priya Sharma", requesterIndex: 1, introMessage: "Games night + terrace = sign me up!", status: "pending" },
  { partySlug: "party_games_delhi", requesterName: "Aaditya Rao", requesterIndex: 0, introMessage: "Delhi underground is my scene!", status: "pending" },
  { partySlug: "party_games_delhi", requesterName: "You", requesterIndex: 6, introMessage: "Never been to a games night — sounds fun!", status: "pending" },
];

const DEMO_REVIEWS = [
  { partySlug: "party_rnb_leith", userIndex: 6, rating: 5, comment: "Amazing night! Playlist was fire 🎵" },
  { partySlug: "party_games_newington", userIndex: 2, rating: 4, comment: "Such a fun evening — best host 🎲" },
  { partySlug: "party_bollywood_marchmont", userIndex: 5, rating: 5, comment: "Best Bollywood night in Edinburgh! 💃" },
  { partySlug: "party_lofi_london", userIndex: 0, rating: 5, comment: "Sunset + lo-fi = perfection 🌙" },
  { partySlug: "party_retro_manchester", userIndex: 3, rating: 4, comment: "Loved the vinyl setup! 📼" },
];

export async function autoSeed(): Promise<void> {
  if (seeded) return;

  // Check if already seeded
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log("📊 Database already seeded, skipping auto-seed");
    // Even if already seeded, verify hostId integrity — parties may reference
    // user IDs that no longer exist (e.g. after a partial re-seed or manual
    // DB wipe). Repair any broken references before returning.
    await repairHostIntegrity();
    seeded = true;
    return;
  }

  console.log("🌱 Auto-seeding VibeMatch database...");
  const startTime = Date.now();

  try {
    // Users
    const users: any[] = [];
    for (const u of DEMO_USERS) {
      const created = await User.create(u);
      users.push(created);
    }

    // Parties + Menus
    const partyIdMap: Record<string, string> = {};
    for (const p of DEMO_PARTIES) {
      const host = users[p.hostIndex];
      const partyStart = new Date(`${p.date}T${p.time}:00`);
      const revealAt = new Date(
        partyStart.getTime() - (p.locationRevealHoursBefore ?? 3) * 3_600_000,
      );

      const party = await Party.create({
        title: p.title,
        city: p.city,
        area: p.area,
        date: p.date,
        time: p.time,
        fee: p.fee,
        maxGuests: p.maxGuests,
        vibes: p.vibes,
        description: p.description,
        hostName: p.hostName,
        hostId: host._id.toString(),
        lat: p.lat,
        lng: p.lng,
        guestCount: p.guestCount,
        approvalRequired: true,
        acceptJoiners: true,
        menuOpen: true,
        locationRevealAt: revealAt,
        spotifyPlaylistUrl: p.spotifyPlaylistUrl || '',
      });

      partyIdMap[p.slug] = party._id.toString();

      // Menu items
      for (const m of p.menu) {
        await MenuItem.create({
          partyId: party._id.toString(),
          name: m.name,
          price: Math.round(m.price * 100) / 100,
          emoji: m.emoji,
          category: m.category,
        });
      }
    }

    // Join requests
    for (const jr of DEMO_JOIN_REQUESTS) {
      const requester = users[jr.requesterIndex];
      await JoinRequest.create({
        partyId: partyIdMap[jr.partySlug],
        requesterName: jr.requesterName,
        introMessage: jr.introMessage,
        status: jr.status,
        requesterId: requester._id.toString(),
      });
    }

    // Reviews
    for (const r of DEMO_REVIEWS) {
      const reviewer = users[r.userIndex];
      await Review.create({
        partyId: partyIdMap[r.partySlug],
        userId: reviewer._id.toString(),
        rating: r.rating,
        comment: r.comment,
      });
    }

    // Party views (batch)
    const viewOps: any[] = [];
    for (const p of DEMO_PARTIES) {
      const target = 20 + Math.floor(Math.random() * 60);
      for (let i = 0; i < target; i++) {
        viewOps.push({ partyId: partyIdMap[p.slug], userId: null });
      }
    }
    if (viewOps.length > 0) {
      await PartyView.insertMany(viewOps);
    }

    // Chat thread: Jamie ↔ You
    const you = users[6];
    const jamie = users[3];
    const thread = await ChatThread.create({
      userAId: you._id.toString(),
      userBId: jamie._id.toString(),
      partyId: partyIdMap["party_lofi_london"],
    });
    await Message.create({
      threadId: thread._id.toString(),
      senderId: jamie._id.toString(),
      receiverId: you._id.toString(),
      content: "Hey! Excited for the rooftop session 🎉",
    });
    await Message.create({
      threadId: thread._id.toString(),
      senderId: you._id.toString(),
      receiverId: jamie._id.toString(),
      content: "Same! Bringing a friend if that's cool?",
      read: true,
    });

    // Order + Ticket for You on Aaditya's party
    const aadityaPartyId = partyIdMap["party_rnb_leith"];
    const menuItems = await MenuItem.find({ partyId: aadityaPartyId }).lean();
    const jd = menuItems.find((m: any) => m.name.toLowerCase().includes("jack"));
    const nachos = menuItems.find((m: any) => m.name.toLowerCase().includes("nachos"));
    const order = await Order.create({
      userId: you._id.toString(),
      partyId: aadityaPartyId,
      totalAmount: 15,
      currency: "£",
      status: "paid",
      items: [
        { name: "Entry ticket", emoji: "🎟️", unitPrice: 7, quantity: 1 },
        jd
          ? { menuItemId: jd._id.toString(), name: jd.name, emoji: jd.emoji, unitPrice: jd.price, quantity: 2 }
          : { name: "Jack Daniels shot", emoji: "🥃", unitPrice: 2, quantity: 2 },
        nachos
          ? { menuItemId: nachos._id.toString(), name: nachos.name, emoji: nachos.emoji, unitPrice: nachos.price, quantity: 1 }
          : { name: "Nachos plate", emoji: "🍟", unitPrice: 4, quantity: 1 },
      ],
    });
    await Ticket.create({
      orderId: order._id.toString(),
      userId: you._id.toString(),
      partyId: aadityaPartyId,
      qrHash: `VM-${order._id.toString().slice(-8).toUpperCase()}`,
    });

    // Saved parties
    await SavedParty.create({ userId: you._id.toString(), partyId: partyIdMap["party_lofi_london"] });
    await SavedParty.create({ userId: you._id.toString(), partyId: partyIdMap["party_bollywood_marchmont"] });

    // Trust ratings
    const aaditya = users[0];
    const raj = users[2];
    await TrustRating.create({ partyId: aadityaPartyId, hostId: aaditya._id.toString(), guestId: you._id.toString(), rating: 5, note: "Great guest!" });
    await TrustRating.create({ partyId: partyIdMap["party_bollywood_marchmont"], hostId: raj._id.toString(), guestId: you._id.toString(), rating: 4, note: "Showed up on time" });
    await TrustRating.create({ partyId: partyIdMap["party_lofi_london"], hostId: jamie._id.toString(), guestId: aaditya._id.toString(), rating: 5, note: "Respectful and fun" });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Auto-seed complete! ${users.length} users, ${DEMO_PARTIES.length} parties, ${DEMO_JOIN_REQUESTS.length} requests (${elapsed}ms)`);
    seeded = true;
  } catch (error: any) {
    console.error("❌ Auto-seed error:", error.message);
    throw error;
  }
}

/**
 * Verify that every party's hostId references an existing User document.
 * If a party has a broken hostId (user was deleted, DB was partially wiped),
 * try to re-link by hostName. If no user matches the name, create a stub
 * host user so the party is never orphaned.
 */
async function repairHostIntegrity(): Promise<void> {
  try {
    const parties = await Party.find({}).lean({ virtuals: true });
    if (parties.length === 0) return;

    // Collect all unique hostIds that are set
    const hostIds = [...new Set(parties.map((p) => p.hostId).filter(Boolean))] as string[];
    if (hostIds.length === 0) return;

    // Check which hostIds actually resolve to users
    const existingHosts = await User.find({ _id: { $in: hostIds } }).lean({ virtuals: true });
    const existingHostIdSet = new Set(existingHosts.map((h) => (h.id ?? h._id?.toString())));

    let repaired = 0;
    for (const party of parties) {
      const pid = party.id ?? party._id?.toString();
      if (!party.hostId) {
        // No hostId at all — try to find user by name
        if (party.hostName) {
          const hostByName = await User.findOne({ name: party.hostName }).lean({ virtuals: true });
          if (hostByName) {
            const hid = hostByName.id ?? hostByName._id?.toString();
            await Party.findByIdAndUpdate(pid, { $set: { hostId: hid } });
            repaired++;
          }
        }
      } else if (!existingHostIdSet.has(party.hostId)) {
        // hostId is broken — try name lookup, or create a stub host
        let fixed = false;
        if (party.hostName) {
          const hostByName = await User.findOne({ name: party.hostName }).lean({ virtuals: true });
          if (hostByName) {
            const hid = hostByName.id ?? hostByName._id?.toString();
            await Party.findByIdAndUpdate(pid, { $set: { hostId: hid } });
            fixed = true;
            repaired++;
          }
        }
        if (!fixed) {
          // Create a stub host user so the party is not orphaned
          const stub = await User.create({
            phone: `+4477009stub${pid.slice(-6)}`,
            name: party.hostName || "Unknown Host",
            role: "host" as const,
            vibes: 0,
            hosted: 1,
            rating: 5.0,
            ratingCount: 0,
            vibePrefs: "",
          });
          const stubId = stub._id.toString();
          await Party.findByIdAndUpdate(pid, { $set: { hostId: stubId } });
          repaired++;
        }
      }
    }

    if (repaired > 0) {
      console.log(`🔧 Host integrity repair: fixed ${repaired} broken hostId reference(s)`);
    }
  } catch (err) {
    console.warn("⚠️ Host integrity repair failed (non-fatal):", err);
  }
}
