# 4 ขาหาบ้าน (4KhaHaBan) — Project Context for AI Agents

## What is this project?

**4 ขาหาบ้าน** (4KhaHaBan) is a **Tinder-style stray animal adoption web app** for Thailand. Users swipe through cards of adoptable dogs and cats — swipe right to "Like", left to "Nope", up to "Super Like" — then match with shelters and chat to arrange adoptions. The app also includes donation/sponsorship features and an admin dashboard.

**Target audience:** Thai users (primary language is Thai).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | React 18 + Vite 5 | SPA, client-side routing |
| **Routing** | react-router-dom v6 | Nested routes with route guards |
| **Styling** | TailwindCSS v4 + custom CSS (`app-styles.css`, `index.css`) | Design tokens in `DESIGN.md` frontmatter and `tailwind.config.js` |
| **Animations** | Framer Motion v11 | Swipe card physics, page transitions |
| **Icons** | lucide-react | Consistent icon set |
| **Backend** | Supabase (Auth + Database) | Google OAuth & Email/Password auth, `profiles` table for role management |
| **State** | React Context API | `AuthContext` (auth/role), `AppContext` (matches) |
| **Mock Data** | `src/mockData.js` | Fallback data when Supabase is unavailable; API service (`src/services/api.js`) wraps mock data with simulated delays |
| **Language** | JavaScript (JSX), no TypeScript | `jsconfig.json` with `@` alias to `./src` |

---

## Architecture Overview

```
App (BrowserRouter)
├── AppProvider (global match state)
│   └── AuthProvider (Supabase auth + role)
│       └── RoleEnforcer (redirects `foundation` users to verification)
│           ├── Navigation (bottom tab bar on mobile, sidebar on desktop)
│           └── <Routes>
│               ├── / → Feed (public, swipe cards)
│               ├── /login → Login (public)
│               ├── /animal/:id → AnimalProfile (public)
│               ├── [ProtectedRoute] (requires login)
│               │   ├── /matches → MatchChat
│               │   ├── /chat/:matchId → ChatRoom
│               │   ├── /donation → Donation
│               │   ├── /profile → UserProfile
│               │   └── /verify-foundation → FoundationVerification
│               └── [AdminRoute] (requires super_admin role)
│                   └── /admin → AdminDashboard
```

---

## User Roles & Auth Flow

There are **3 user roles** stored in Supabase `profiles.role`:

| Role | Access | Notes |
|---|---|---|
| `user` | Feed, Matches, Chat, Donation, Profile | Default role for new signups |
| `foundation` | Forced to `/verify-foundation` on every protected route | Shelter/foundation accounts must verify identity before accessing other features |
| `super_admin` | Everything + `/admin` dashboard | Full user management, shelter approval |

**Auth methods:** Google OAuth, Email/Password signup & login.

**Important behavior:** The `RoleEnforcer` component (in `App.jsx`) + `ProtectedRoute` both redirect `foundation` users to `/verify-foundation` regardless of which page they try to access. The `pending_role` is also stored in `localStorage` as a fallback when Supabase RLS blocks profile updates.

---

## Directory Structure

```
HaBan/
├── .env                          # Supabase URL + Anon Key
├── DESIGN.md                     # Design system (colors, typography, components, interactions)
├── PRODUCT.md                    # Product requirements document
├── index.html                    # Vite entry HTML
├── package.json
├── vite.config.js                # Vite config with @/ alias
├── tailwind.config.js            # TailwindCSS v4 config with custom design tokens
├── postcss.config.js
└── src/
    ├── main.jsx                  # React entry point
    ├── App.jsx                   # Root component, routing, providers
    ├── index.css                 # Global CSS reset & base styles
    ├── app-styles.css            # All component/page styles (large file ~40KB)
    ├── mockData.js               # Mock animals, matches, messages
    ├── components/
    │   ├── Navigation.jsx        # Bottom tab bar (mobile) / sidebar (desktop)
    │   ├── SwipeCard.jsx         # Draggable Tinder card with Framer Motion
    │   ├── ProtectedRoute.jsx    # Auth guard, redirects to /login
    │   └── AdminRoute.jsx        # super_admin guard, redirects to /
    ├── context/
    │   ├── AuthContext.jsx       # Supabase auth, role management, login/register/logout
    │   └── AppContext.jsx        # Global match state, addMatch()
    ├── pages/
    │   ├── Feed.jsx              # Main swipe feed (card deck + action buttons)
    │   ├── Login.jsx             # Login/Register with role selection (user/foundation)
    │   ├── AnimalProfile.jsx     # Detailed pet profile modal/page
    │   ├── MatchChat.jsx         # List of matches with last message
    │   ├── ChatRoom.jsx          # 1:1 chat between adopter and shelter
    │   ├── Donation.jsx          # Donation campaigns, QR/PromptPay
    │   ├── UserProfile.jsx       # User profile & settings
    │   ├── AdminDashboard.jsx    # Super admin user/shelter management
    │   └── FoundationVerification.jsx  # Foundation identity verification form
    └── services/
        ├── supabaseClient.js     # Supabase client init (graceful fallback if env vars missing)
        └── api.js                # Mock API layer with simulated delays
```

---

## Key Design Decisions & Patterns

### 1. Graceful Supabase Fallback
The app is designed to work **without Supabase** configured. If env vars are missing, `supabaseClient.js` exports `null` and `AuthContext` skips auth initialization. The API layer (`api.js`) uses mock data exclusively, so the Feed and other features work even without a backend.

### 2. Styling Approach
- **Do NOT use vanilla CSS for new components.** The project uses TailwindCSS v4 for utility classes AND a large custom CSS file (`app-styles.css`) for component-specific styles.
- The design system is documented in `DESIGN.md` (colors, typography, border-radius, etc.). Always reference these tokens.
- Font: **Prompt** (Thai-optimized Google Font).

### 3. Code Splitting
All page components are lazy-loaded via `React.lazy()` in `App.jsx` for performance.

### 4. Mobile-First
The app is designed as a **mobile-first responsive web app**. The navigation is a bottom tab bar on mobile and a sidebar on desktop. The swipe card feed is optimized for touch gestures.

### 5. Thai Language
- All UI text is in Thai.
- Comments in code are in Thai.
- The app targets Thai users and Thai shelters.

---

## Important Files to Read First

If you need to understand the project quickly, read these files in order:

1. **`PRODUCT.md`** — Product requirements, user types, capabilities
2. **`DESIGN.md`** — Design system tokens, component specs, interaction guidelines
3. **`src/App.jsx`** — Routing structure and provider hierarchy
4. **`src/context/AuthContext.jsx`** — Auth flow, role management logic
5. **`src/mockData.js`** — Data shapes for animals, matches, messages

---

## Rules for AI Agents

1. **Keep all user-facing text in Thai.** Do not switch to English for UI labels, button text, placeholder text, or error messages.
2. **Follow the design system in `DESIGN.md`.** Use the defined color tokens, typography scale, and component specs. Do not invent new colors or fonts.
3. **Maintain the existing code style.** JSX components use named exports for components and default exports for pages. Comments are in Thai.
4. **Do not break the Supabase fallback.** Always check `if (!supabase)` before calling Supabase methods. The app must remain functional without a backend.
5. **Use Framer Motion for animations.** The swipe card and transitions already use Framer Motion. Don't mix in other animation libraries.
6. **Use the `@/` path alias** for imports (e.g., `import { api } from '@/services/api'`).
7. **Reference `DESIGN.md` and `PRODUCT.md`** before making design or feature decisions. These are the source of truth.
8. **ห้ามใช้อิโมจิ (No Unicode Emojis).** ห้ามใช้อิโมจิในโค้ด ข้อความ และหน้าจอ UI เด็ดขาด ให้ใช้ SVG icons จากไลบรารี `lucide-react` เท่านั้น เพื่อความเป็นมืออาชีพและความสม่ำเสมอของดีไซน์
