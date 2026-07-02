/**
 * MongoDB Seed Script for VibeMatch
 *
 * Seeds the database with rich demo data using Mongoose models.
 *
 * Usage:
 *   bun run scripts/seed-mongo.ts
 *
 * Make sure MONGODB_URI is set in your .env file.
 */

import mongoose from 'mongoose';
import { connectDB } from '../src/lib/mongodb';
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
} from '../src/models';

// ─── Helpers ────────────────────────────────────────────────────────────────

function relDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    phone: '+447700900001',
    name: 'Aaditya Rao',
    username: 'aaditya',
    bio: 'Flat parties in Leith · R&B and hip-hop 🎵',
    city: 'Edinburgh',
    profession: 'Software eng.',
    instagram: 'aaditya.nights',
    vibes: 64,
    hosted: 6,
    rating: 4.9,
    ratingCount: 18,
    vibePrefs: 'R&B,Chill',
    role: 'host' as const,
  },
  {
    phone: '+447700900002',
    name: 'Priya Sharma',
    username: 'priya',
    bio: 'Games nights + boardgame evenings in Newington 🎮',
    city: 'Edinburgh',
    profession: 'Designer',
    instagram: 'priya.games',
    vibes: 52,
    hosted: 4,
    rating: 4.8,
    ratingCount: 11,
    vibePrefs: 'Games,Chill',
    role: 'host' as const,
  },
  {
    phone: '+447700900003',
    name: 'Raj Malhotra',
    username: 'raj',
    bio: 'Bollywood nights + dancing in Marchmont 🌿',
    city: 'Edinburgh',
    profession: 'Finance',
    instagram: 'raj.bollywood',
    vibes: 41,
    hosted: 3,
    rating: 4.7,
    ratingCount: 9,
    vibePrefs: 'Bollywood,EDM',
    role: 'partier' as const,
  },
  {
    phone: '+447700900004',
    name: 'Jamie Thompson',
    username: 'jamie',
    bio: 'Lo-fi & chill · London rooftops 🌙',
    city: 'London',
    profession: 'Healthcare',
    instagram: 'jamie.lofi',
    vibes: 88,
    hosted: 11,
    rating: 5.0,
    ratingCount: 26,
    vibePrefs: 'Lo-fi,Chill',
    role: 'host' as const,
  },
  {
    phone: '+447700900005',
    name: 'Maya Khan',
    username: 'maya',
    bio: 'Retro + vinyl nights in Manchester 📼',
    city: 'Manchester',
    profession: 'Student',
    instagram: 'maya.vinyl',
    vibes: 35,
    hosted: 5,
    rating: 4.6,
    ratingCount: 12,
    vibePrefs: 'Retro,EDM',
    role: 'host' as const,
  },
  {
    phone: '+447700900006',
    name: 'Sam Wilson',
    username: 'sam',
    bio: 'Student · always down for a flat party 🍻',
    city: 'Edinburgh',
    profession: 'Student',
    instagram: 'sam.party',
    vibes: 9,
    hosted: 0,
    rating: 4.5,
    ratingCount: 2,
    vibePrefs: 'R&B,Bollywood',
    role: 'partier' as const,
  },
  {
    phone: '+447700900007',
    name: 'You',
    username: 'you',
    bio: 'Just here for the vibes ✨',
    city: 'Edinburgh',
    profession: 'Student',
    instagram: 'you.vibes',
    vibes: 12,
    hosted: 0,
    rating: 5.0,
    ratingCount: 3,
    vibePrefs: 'Chill,R&B,Games',
    role: 'partier' as const,
  },
];

const DEMO_PARTIES = [
  {
    slug: 'party_rnb_leith',
    title: "Aaditya's flat party",
    city: 'Edinburgh',
    area: 'Leith, Edinburgh',
    date: relDate(3),
    time: '21:00',
    fee: 7,
    maxGuests: 15,
    vibes: 'R&B,Chill',
    description:
      "R&B night at mine — slow jams, good drinks, and a proper flat session. Small group, good chat, music till late. £7 entry covers the space and snacks; drinks add-on available after you grab your spot.",
    hostName: 'Aaditya Rao',
    hostIndex: 0,
    coverEmoji: '🎵',
    coverBg: '#1a1035',
    lat: 55.9667,
    lng: -3.1739,
    guestCount: 8,
    locationRevealHoursBefore: 3,
    menu: [
      { name: 'Jack Daniels shot', price: 2, emoji: '🥃', category: 'drink' },
      { name: 'Small Norfolk can', price: 1, emoji: '🍺', category: 'drink' },
      { name: 'Nachos plate', price: 4, emoji: '🍟', category: 'snack' },
      { name: 'Soft drink', price: 1.5, emoji: '🥤', category: 'soft' },
    ],
  },
  {
    slug: 'party_games_newington',
    title: "Priya's games night",
    city: 'Edinburgh',
    area: 'Newington, Edinburgh',
    date: relDate(2),
    time: '20:00',
    fee: 5,
    maxGuests: 12,
    vibes: 'Games,Chill',
    description:
      'Boardgames + chill. Catan, Codenames, and maybe a round of Cards Against Humanity. Bring your A-game. Snacks and soft drinks provided; BYOB welcome.',
    hostName: 'Priya Sharma',
    hostIndex: 1,
    coverEmoji: '🎮',
    coverBg: '#0d1f2d',
    lat: 55.9467,
    lng: -3.1832,
    guestCount: 5,
    locationRevealHoursBefore: 3,
    menu: [
      { name: 'Craft beer can', price: 2, emoji: '🍺', category: 'drink' },
      { name: 'Crisps bowl', price: 1, emoji: '🥨', category: 'snack' },
      { name: 'Soft drink', price: 1, emoji: '🥤', category: 'soft' },
    ],
  },
  {
    slug: 'party_bollywood_marchmont',
    title: "Raj's Bollywood night",
    city: 'Edinburgh',
    area: 'Marchmont, Edinburgh',
    date: relDate(3),
    time: '22:00',
    fee: 6,
    maxGuests: 13,
    vibes: 'Bollywood',
    description:
      "Bollywood + Punjabi beats all night. Dancing mandatory. Come for the music, stay for the samosas. Almost full — grab one of the last spots!",
    hostName: 'Raj Malhotra',
    hostIndex: 2,
    coverEmoji: '🌿',
    coverBg: '#1a2410',
    lat: 55.9389,
    lng: -3.1933,
    guestCount: 11,
    locationRevealHoursBefore: 3,
    menu: [
      { name: 'Kingfisher can', price: 2, emoji: '🍺', category: 'drink' },
      { name: 'Samosa plate', price: 3, emoji: '🥟', category: 'snack' },
      { name: 'Mango lassi', price: 2, emoji: '🥤', category: 'soft' },
    ],
  },
  {
    slug: 'party_lofi_london',
    title: "Jamie's rooftop lo-fi",
    city: 'London',
    area: 'Shoreditch, London',
    date: relDate(5),
    time: '19:30',
    fee: 9,
    maxGuests: 20,
    vibes: 'Lo-fi,Chill',
    description:
      "Sunset lo-fi on a Shoreditch rooftop. Vinyl + chill beats, blankets, and a great view. Bring a jumper — it gets cold up top.",
    hostName: 'Jamie Thompson',
    hostIndex: 3,
    coverEmoji: '🌙',
    coverBg: '#1a1035',
    lat: 51.5258,
    lng: -0.0777,
    guestCount: 14,
    locationRevealHoursBefore: 6,
    menu: [
      { name: 'Craft lager', price: 3, emoji: '🍺', category: 'drink' },
      { name: 'Olives bowl', price: 3, emoji: '🫒', category: 'snack' },
      { name: 'Soft drink', price: 2, emoji: '🥤', category: 'soft' },
    ],
  },
  {
    slug: 'party_retro_manchester',
    title: "Maya's vinyl retro night",
    city: 'Manchester',
    area: 'Northern Quarter, Manchester',
    date: relDate(7),
    time: '20:00',
    fee: 5,
    maxGuests: 18,
    vibes: 'Retro,EDM',
    description:
      "Spin the wax — 80s and 90s retro on actual vinyl. Northern Quarter studio space, proper sound system. Dress up if you want, no pressure.",
    hostName: 'Maya Khan',
    hostIndex: 4,
    coverEmoji: '📼',
    coverBg: '#0d1f2d',
    lat: 53.4839,
    lng: -2.2333,
    guestCount: 6,
    locationRevealHoursBefore: 4,
    menu: [
      { name: 'Gin & tonic', price: 4, emoji: '🍸', category: 'drink' },
      { name: 'Cheese board', price: 5, emoji: '🧀', category: 'snack' },
      { name: 'Soft drink', price: 2, emoji: '🥤', category: 'soft' },
    ],
  },
  {
    slug: 'party_byob_delhi',
    title: "Sam's BYOB terrace",
    city: 'Delhi',
    area: 'Hauz Khas, Delhi',
    date: relDate(4),
    time: '21:00',
    fee: 3,
    maxGuests: 16,
    vibes: 'BYOB,Chill',
    description:
      "BYOB terrace session in Hauz Khas. Bring your own bottle, we'll handle the ice and mixers. Bollywood on low, deep house on high. Mumbai-style late night.",
    hostName: 'Sam Wilson',
    hostIndex: 5,
    coverEmoji: '🍾',
    coverBg: '#1a1035',
    lat: 28.5494,
    lng: 77.2001,
    guestCount: 10,
    locationRevealHoursBefore: 3,
    menu: [
      { name: 'Ice bucket', price: 1, emoji: '🧊', category: 'soft' },
      { name: 'Mixers set', price: 2, emoji: '🥤', category: 'soft' },
      { name: 'Chips bowl', price: 1, emoji: '🥨', category: 'snack' },
    ],
  },
];

// ─── Join Requests ──────────────────────────────────────────────────────────

const DEMO_JOIN_REQUESTS = [
  // Aaditya's R&B party
  { partyId: 'party_rnb_leith', requesterName: 'Sam Wilson', requesterIndex: 5, introMessage: 'Hey! R&B is my vibe, bringing good energy 🎵', status: 'accepted' },
  { partyId: 'party_rnb_leith', requesterName: 'You', requesterIndex: 6, introMessage: 'First flat party in Edinburgh — excited to meet everyone!', status: 'accepted' },
  { partyId: 'party_rnb_leith', requesterName: 'Raj Malhotra', requesterIndex: 2, introMessage: 'Can I DJ for a bit? Got the best R&B playlist 🔥', status: 'pending' },

  // Priya's games night
  { partyId: 'party_games_newington', requesterName: 'You', requesterIndex: 6, introMessage: 'Love Catan! Happy to bring snacks 🍕', status: 'accepted' },
  { partyId: 'party_games_newington', requesterName: 'Raj Malhotra', requesterIndex: 2, introMessage: 'Board game night sounds perfect for a chilled evening', status: 'accepted' },
  { partyId: 'party_games_newington', requesterName: 'Aaditya Rao', requesterIndex: 0, introMessage: 'Count me in — I\'m a Codenames champion 💪', status: 'pending' },

  // Raj's Bollywood night
  { partyId: 'party_bollywood_marchmont', requesterName: 'Sam Wilson', requesterIndex: 5, introMessage: 'Bollywood night?! I\'m SO there 💃', status: 'accepted' },
  { partyId: 'party_bollywood_marchmont', requesterName: 'You', requesterIndex: 6, introMessage: 'Never been to a Bollywood party — this sounds amazing!', status: 'pending' },
  { partyId: 'party_bollywood_marchmont', requesterName: 'Priya Sharma', requesterIndex: 1, introMessage: 'Samosas + dancing = perfect combo 🥟', status: 'pending' },

  // Jamie's lo-fi rooftop
  { partyId: 'party_lofi_london', requesterName: 'Aaditya Rao', requesterIndex: 0, introMessage: 'Visiting London that weekend — rooftop vibes yes please!', status: 'accepted' },
  { partyId: 'party_lofi_london', requesterName: 'You', requesterIndex: 6, introMessage: 'Lo-fi + rooftop = dream night. Can I bring a friend?', status: 'pending' },
  { partyId: 'party_lofi_london', requesterName: 'Maya Khan', requesterIndex: 4, introMessage: 'Taking the train down — this is going to be special ✨', status: 'pending' },

  // Maya's retro night
  { partyId: 'party_retro_manchester', requesterName: 'Jamie Thompson', requesterIndex: 3, introMessage: 'Retro vinyl? I have some 80s records I could bring 📼', status: 'accepted' },
  { partyId: 'party_retro_manchester', requesterName: 'Sam Wilson', requesterIndex: 5, introMessage: 'Manchester road trip! What\'s the dress code?', status: 'pending' },

  // Sam's BYOB terrace
  { partyId: 'party_byob_delhi', requesterName: 'Raj Malhotra', requesterIndex: 2, introMessage: 'Hauz Khas nights are the best — I\'ll bring Kingfisher 🍺', status: 'accepted' },
  { partyId: 'party_byob_delhi', requesterName: 'Priya Sharma', requesterIndex: 1, introMessage: 'BYOB + terrace + Bollywood = sign me up!', status: 'pending' },
];

// ─── Reviews ────────────────────────────────────────────────────────────────

const DEMO_REVIEWS = [
  { partyId: 'party_rnb_leith', userIndex: 6, rating: 5, comment: 'Amazing night! Aaditya\'s playlist was fire and the crowd was great. Will definitely come back 🎵' },
  { partyId: 'party_games_newington', userIndex: 2, rating: 4, comment: 'Such a fun evening — Priya is the best host. Catan got competitive! 🎲' },
  { partyId: 'party_bollywood_marchmont', userIndex: 5, rating: 5, comment: 'Best Bollywood night in Edinburgh! The samosas were incredible and the music was non-stop 💃' },
  { partyId: 'party_lofi_london', userIndex: 0, rating: 5, comment: 'Sunset + lo-fi beats + rooftop views = perfection. Jamie knows how to set a vibe 🌙' },
  { partyId: 'party_retro_manchester', userIndex: 3, rating: 4, comment: 'Loved the vinyl setup! Real records on a proper sound system. Northern Quarter never disappoints 📼' },
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding VibeMatch (MongoDB)...');

  await connectDB();
  console.log('  ✓ connected to MongoDB');

  // ── Clear all collections ──────────────────────────────────────────────────
  const collections = [
    Ticket, Order, MenuItem, Review, PartyView, SavedParty,
    Message, ChatThread, JoinRequest, Party, User, TrustRating,
  ];
  for (const Model of collections) {
    await Model.deleteMany({});
  }
  console.log('  ✓ cleared existing data');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users: InstanceType<typeof User>[] = [];
  for (const u of DEMO_USERS) {
    const created = await User.create(u);
    users.push(created);
  }
  console.log(`  ✓ created ${users.length} users`);

  // ── Parties + Menus ────────────────────────────────────────────────────────
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
      coverUrl: null,
      lat: p.lat,
      lng: p.lng,
      guestCount: p.guestCount,
      approvalRequired: true,
      acceptJoiners: true,
      menuOpen: true,
      locationRevealAt: revealAt,
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
  console.log(`  ✓ created ${DEMO_PARTIES.length} parties with menus`);

  // ── Join Requests ──────────────────────────────────────────────────────────
  let requestCount = 0;
  for (const jr of DEMO_JOIN_REQUESTS) {
    const requester = jr.requesterIndex >= 0 ? users[jr.requesterIndex] : null;
    await JoinRequest.create({
      partyId: partyIdMap[jr.partyId],
      requesterName: jr.requesterName,
      requesterId: requester?._id.toString(),
      introMessage: jr.introMessage,
      status: jr.status,
    });
    requestCount++;
  }
  console.log(`  ✓ created ${requestCount} join requests`);

  // ── Reviews ────────────────────────────────────────────────────────────────
  let reviewCount = 0;
  for (const r of DEMO_REVIEWS) {
    const reviewer = users[r.userIndex];
    await Review.create({
      partyId: partyIdMap[r.partyId],
      userId: reviewer._id.toString(),
      rating: r.rating,
      comment: r.comment,
    });
    reviewCount++;
  }
  console.log(`  ✓ created ${reviewCount} reviews`);

  // ── Party Views (20-80 per party, for analytics) ──────────────────────────
  let totalViews = 0;
  for (const p of DEMO_PARTIES) {
    const viewCount = randomInt(20, 80);
    const bulkViews = [];
    for (let i = 0; i < viewCount; i++) {
      // Randomly attribute some views to existing users
      const userId = Math.random() < 0.3
        ? users[randomInt(0, users.length - 1)]._id.toString()
        : undefined;
      bulkViews.push({
        partyId: partyIdMap[p.slug],
        userId,
      });
    }
    await PartyView.insertMany(bulkViews);
    totalViews += viewCount;
  }
  console.log(`  ✓ created ${totalViews} party views across ${DEMO_PARTIES.length} parties`);

  // ── Chat Thread (Jamie ↔ You about the lo-fi party) ───────────────────────
  const you = users[6];
  const jamie = users[3];
  const thread = await ChatThread.create({
    userAId: you._id.toString(),
    userBId: jamie._id.toString(),
    partyId: partyIdMap['party_lofi_london'],
  });

  await Message.create({
    threadId: thread._id.toString(),
    senderId: jamie._id.toString(),
    receiverId: you._id.toString(),
    content: 'Hey! Excited for the rooftop session 🎉',
    read: false,
    kind: 'text',
  });

  await Message.create({
    threadId: thread._id.toString(),
    senderId: you._id.toString(),
    receiverId: jamie._id.toString(),
    content: "Same! Bringing a friend if that's cool?",
    read: true,
    kind: 'text',
  });
  console.log('  ✓ seeded demo chat thread (Jamie ↔ You)');

  // ── Order + Ticket (demo paid order for "You" on Aaditya's party) ─────────
  const aadityaParty = await Party.findById(partyIdMap['party_rnb_leith']);
  if (aadityaParty) {
    const menuItems = await MenuItem.find({ partyId: partyIdMap['party_rnb_leith'] });
    const jd = menuItems.find((m) => m.name.toLowerCase().includes('jack'));
    const nachos = menuItems.find((m) => m.name.toLowerCase().includes('nachos'));

    const order = await Order.create({
      userId: you._id.toString(),
      partyId: partyIdMap['party_rnb_leith'],
      totalAmount: 15, // £7 entry + £4 JD x2 + £4 nachos
      currency: '£',
      status: 'paid',
      items: [
        { name: 'Entry ticket', emoji: '🎟️', unitPrice: 7, quantity: 1 },
        jd
          ? { menuItemId: jd._id.toString(), name: jd.name, emoji: jd.emoji, unitPrice: jd.price, quantity: 2 }
          : { name: 'Jack Daniels shot', emoji: '🥃', unitPrice: 2, quantity: 2 },
        nachos
          ? { menuItemId: nachos._id.toString(), name: nachos.name, emoji: nachos.emoji, unitPrice: nachos.price, quantity: 1 }
          : { name: 'Nachos plate', emoji: '🍟', unitPrice: 4, quantity: 1 },
      ],
    });

    await Ticket.create({
      orderId: order._id.toString(),
      userId: you._id.toString(),
      partyId: partyIdMap['party_rnb_leith'],
      qrHash: `VM-${order._id.toString().slice(-8).toUpperCase()}-RNB`,
    });
    console.log("  ✓ seeded demo order + ticket for 'You'");
  }

  // ── Saved Parties (You has saved 2 parties) ──────────────────────────────
  await SavedParty.create({
    userId: you._id.toString(),
    partyId: partyIdMap['party_lofi_london'],
  });
  await SavedParty.create({
    userId: you._id.toString(),
    partyId: partyIdMap['party_bollywood_marchmont'],
  });
  console.log("  ✓ seeded 2 saved parties for 'You'");

  // ── Trust Ratings (from hosts about guests) ──────────────────────────────
  await TrustRating.create({
    partyId: partyIdMap['party_rnb_leith'],
    hostId: users[0]._id.toString(), // Aaditya
    guestId: you._id.toString(),      // You
    rating: 5,
    note: 'Great guest, arrived on time and brought good vibes!',
  });
  await TrustRating.create({
    partyId: partyIdMap['party_rnb_leith'],
    hostId: users[0]._id.toString(), // Aaditya
    guestId: users[5]._id.toString(), // Sam
    rating: 4,
    note: 'Nice guy, would host again.',
  });
  await TrustRating.create({
    partyId: partyIdMap['party_games_newington'],
    hostId: users[1]._id.toString(), // Priya
    guestId: you._id.toString(),      // You
    rating: 5,
    note: 'Super friendly and brought amazing snacks!',
  });
  console.log('  ✓ seeded 3 trust ratings');

  console.log('✅ Seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
