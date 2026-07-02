# Task 3 - Auth System Overhaul

## Summary
Overhauled the authentication system for VibeMatch: removed Google/Instagram sign-in, added user role support (host/partier), and improved the onboarding flow.

## Changes Made

### 1. Types (`src/lib/types.ts`)
- Added `role?: 'host' | 'partier'` field to `VibeUser` interface

### 2. Store (`src/lib/store.ts`)
- Added `userRole: 'host' | 'partier'` state (default: `'partier'`)
- Added `setUserRole` action
- `login()` now derives `userRole` from `user.role`
- `setCurrentUser()` updates `userRole` from user's role when available
- `logout()` resets `userRole` to `'partier'`
- `userRole` persisted in localStorage via partialize

### 3. Login Screen (`src/screens/login-screen.tsx`)
- **REMOVED** Google and Instagram sign-in buttons entirely
- **REMOVED** "Or continue with" divider
- **REMOVED** `SocialLogin`, `GoogleIcon`, `InstagramIcon` components
- Premium gradient background with animated orbs
- Larger, bolder VibeMatch logo with gradient text
- Better input styling with rounded corners and glow effects
- "Enter your phone number" label above input
- 6-digit OTP input with individual styled boxes
- Smooth entrance animation with fade-in/slide-up
- Loader2 spinner on "Send OTP" and "Verify" buttons
- "By continuing, you agree to our Terms & Privacy Policy" text at bottom

### 4. Onboarding Screen (`src/screens/onboarding-screen.tsx`)
- Added **ROLE SELECTION** as the FIRST step
- Two large, visually distinct cards:
  - 🎉 "I want to HOST parties" — "Create and manage events, approve guests, earn vibes"
  - 🎊 "I want to ATTEND parties" — "Discover events, join the vibe, meet new people"
- Selected card has highlighted border + glow effect (amber shadow)
- Role saved to user profile via API on finish
- STEPS changed from `["city", "vibes", "done"]` to `["role", "city", "vibes", "done"]`
- Back button on city step goes back to role selection

### 5. Auth API (`src/app/api/auth/otp/route.ts`)
- Added `role` parameter to verify step body type
- When creating a new user, saves the `role` field from request
- When existing user verifies with a different role, updates their role
- Changed OTP generation from 5-digit to 6-digit (`100000 + Math.random() * 900000`)
- Added `role` and `profession` to `serializeUser`

### 6. Users API (`src/app/api/users/route.ts`)
- Added `role` to `serializeUser` output
- Added `profession` to `serializeUser` output  
- Added `role` to allowed PATCH fields

### 7. API Client (`src/lib/api.ts`)
- Updated `verifyOtp` signature: added `role?: 'host' | 'partier'` parameter
- Role passed in JSON body to `/api/auth/otp`

### 8. Profile Screen (`src/screens/profile-screen.tsx`)
- Shows role badge next to user name: "🎉 Host" (amber) or "🎊 Partier" (teal)
- Activity section adapted by role:
  - **Hosts**: "My parties", "Requests received", "Analytics"
  - **Partiers**: "My RSVPs", "Saved parties", "Tickets"
- Vibe score description text adapted by role
- Added `Ticket` and `BarChart3` icon imports

## Lint Status
✅ `bun run lint` passes with zero errors
