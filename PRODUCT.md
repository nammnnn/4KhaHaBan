# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Pet Adopters:** Everyday citizens looking for a dog or cat to adopt. They want an engaging, friendly, and transparent Tinder-style swipe interface (Swipe & Match) that makes connecting with shelters straightforward and exciting.
2. **Shelter Operators & Volunteers:** Busy shelter staff and volunteers managing pet profiles, reviewing adoption applications, and handling adoption requests (pending, approved, rejected).
3. **Donors & Sponsors:** Animal lovers who want to sponsor shelter operations or financially contribute to medical treatments and care for specific animals through simple, secure donation channels.

## Product Purpose

4 ขาหาบ้าน (4KhaHaBan) simplifies and accelerates stray animal adoption in Thailand by combining a Tinder-style Swipe & Match discovery feed with direct shelter communication, transparent donation tracking, and shelter management tools.

## Positioning

An engaging, trustworthy, and human-centric adoption matching platform in Thailand that transforms stray animal rescue into an interactive, Tinder-inspired "Swipe & Match" companion discovery experience.

## Operating Context

- **Environment:** Mobile-first responsive web application optimized for mobile viewports while remaining fully usable on tablet and desktop screens.
- **Interactions:** Touch-gestures (swipe left/right/up) and accessible button controls for swiping, direct real-time chat between adopters and shelters, interactive donation progress indicators, and an admin dashboard for shelter staff.
- **Localization:** Primary language is Thai, tailored for local shelters and adopters in Thailand.

## Capabilities and Constraints

### Capabilities
- **Tinder-Style Swipe Feed:** Edge-to-edge card deck supporting Like (right), Nope (left), and Super Like (up) actions with smooth micro-animations.
- **Detailed Pet Profiles:** Modal view displaying pet bio, personality tags, medical history, vaccination status, and shelter distance.
- **Match & Direct Chat:** Instant match notification triggering a dedicated chat channel between adopter and shelter operator.
- **Donation & Sponsorship Hub:** Campaign-based and pet-specific donation progress tracking with QR/PromptPay and bank transfer payment options.
- **Shelter Admin Dashboard:** Management view for adding/editing animal profiles, managing adoption requests, and updating shelter metrics.

### Constraints
- **Typography:** Requires robust support for Thai script using Google Font 'Prompt' with appropriate font sizing and line-heights.
- **Backend Infrastructure:** Powered by Supabase database services with fallback local state/mock data for resilient offline/development modes.

## Brand Commitments

- **Name:** 4 ขาหาบ้าน (4KhaHaBan) - Production Edition
- **Tone & Voice:** Empathetic, trustworthy, professional, and warm.
- **Visual Identity:** Warm Honey Amber primary accent (`#D97706` / `#B45309`), Warm Alabaster canvas (`#FAF8F5`), pure white surfaces (`#FFFFFF`) with 1px neutral borders (`#E5E7EB`), Forest Emerald verified & success accents (`#059669`), and ergonomic Tinder-inspired action controls (Emerald Like `#059669`, Crisp Crimson Nope `#DC2626`, Amber Super Like `#D97706`).

## Evidence on Hand

- `src/mockData.js`: Comprehensive mock dataset covering dogs, cats, shelter details, and adoption request states.
- `DESIGN.md`: Established design system specifications for Tinder-style UI tokens, color palette, typography hierarchy, and component guidelines.
- `src/pages/`: Implementation for Feed (Swipe), Animal Profile, Match Chat, Donation, Login, User Profile, and Admin Dashboard.

## Product Principles

1. **Empathy-First Visual Hierarchy:** Full-bleed pet photography and personality tags lead the experience to forge an emotional connection with potential adopters.
2. **Low-Friction Matching:** Simplify the adoption journey from initial discovery to direct shelter contact with minimum steps.
3. **Transparent Shelter Relationships:** Clearly present shelter credentials, location, and verified request statuses to build user trust.
4. **Actionable Community Support:** Enable effortless financial support alongside adoption matching for overall shelter sustainability.

## Accessibility & Inclusion

- **Thai Typography Support:** Minimum body text size of 16px (`1rem`) and line-height of `1.5` for Prompt font to prevent overcrowding of Thai tone marks and vowels.
- **High Contrast Ratios:** Dark charcoal body text (`#111418`) against light neutral card fills (`#FFFFFF`/`#F3F4F6`) or gradient overlays with high contrast for white text on photo backgrounds.
- **Touch Target Standard:** Minimum 44px x 44px interactive touch targets for all swiping buttons, action icons, and navigation tabs.
