# Task 10+9b — Cleanup API, 5MB Upload Limit, User Playlist

## Summary
All three features implemented and lint-clean.

## Changes Made

### Feature 1: Cleanup Operation API
- **New file**: `src/app/api/cleanup/route.ts` — POST cleans media for events ended >1 week ago, GET checks status by partyId or returns stats
- **Updated**: `src/lib/db/models/Party.ts` — Added `mediaCleaned`, `cleanedAt`, `cleanedMessage` fields to IParty interface and PartySchema
- **Updated**: `src/lib/types.ts` — Added `mediaCleaned`, `cleanedAt`, `cleanedMessage` to Party interface
- **Updated**: `src/app/api/parties/[id]/route.ts` — Serialize new fields in party response
- **Updated**: `src/lib/api/index.ts` — Added `getCleanupStatus(partyId)` method
- **Updated**: `src/features/party/screens/detail-screen.tsx` — Show "Media Cleaned" overlay in hero when `party.mediaCleaned === true`

### Feature 2: 5MB Upload Limit
- **Updated**: `src/features/party/screens/detail-screen.tsx` — Intro video limit changed from 60 MB → 5 MB (check + label)
- **Updated**: `src/features/host/screens/manage-party-screen.tsx` — Image limit 10 MB → 5 MB, Video limit 60 MB → 5 MB, help text updated
- **Updated**: `src/app/api/parties/[id]/media/route.ts` — Added 5 MB upload policy comment

### Feature 3: User Playlist in Music Tab
- **Rewritten**: `src/lib/music/store.ts` — Added `userPlaylist` (PlaylistEntry[]), `addToPlaylist`, `removeFromPlaylist`, `clearPlaylist`, `savePlaylist` (localStorage), `loadSavedPlaylist`, `autoPlayOnLoad`, `setAutoPlayOnLoad`
- **Rewritten**: `src/components/party/music-player.tsx` — Dual-tab UI (Tracks / My Playlist), save/clear playlist buttons, add custom URL form, auto-play on mount, graceful handling of external links
