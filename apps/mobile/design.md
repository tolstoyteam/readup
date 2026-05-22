# Readup Design System

This file documents the current mobile UI style used for the Readup onboarding, setup, Home, Search, and Library screens. The Figma file is the visual reference; the app implements the system in React Native with Expo Router and NativeWind classes where existing code already uses them.

Product UI uses `ReadupColors` in [`shared/constants/readup-theme.ts`](shared/constants/readup-theme.ts) and NativeWind utility classes. Legacy Expo starter components (`ThemedText`, `ThemedView`, Explore tab, modal route) have been removed.

## Colors

| Role | Hex | Usage |
| --- | --- | --- |
| Brand primary | `#059669` | Primary buttons, headings, selected chips, active emphasis |
| Brand primary dark | `#047857` | Primary button border and pressed accents |
| Background default | `#FBFAF2` | Full-screen background |
| Surface | `#F2F0E6` | Cards, tab bar, inputs, segmented controls |
| Elevated / input border | `#E8E6D8` | Subtle input and menu borders |
| Text primary | `#1A2420` | Main content text |
| Text secondary | `#4A5550` | Labels, book titles, inactive navigation |
| Text tertiary | `#7A7868` | Placeholders, secondary links, quiet metadata |
| Text inverse | `#FBFAF2` | Text on brand primary |
| Border default | `#C8C6B2` | Tab bar top border |

## Typography

Use Inter for brand screens and content UI.

| Style | Size | Weight | Tracking | Usage |
| --- | --- | --- | --- | --- |
| Display | 34 | Extra Bold / 800 | `-1.36px` | Setup screen questions |
| Heading 2 | 22 | Semi Bold / 600 | `-0.88px` | Home/Search/Library section titles |
| Heading 3 | 18 | Medium / 500 | `-0.72px` | Category headings, card titles, primary button labels |
| Body | 14 | Regular / 400 | `-0.56px` | Chips, inputs, book labels |
| Body Small | 12 | Regular / 400 | `-0.48px` | Skip links and small helper text |

## Components

### Primary Button

Primary buttons are full-width capsule buttons with a 54px minimum height, `#059669` fill, 2px `#047857` border, and `#FBFAF2` 18px medium text. Use this for the main step action, such as `Продолжить`, `Завершить`, and high-emphasis retries.

### Secondary Link

Secondary actions are text-only buttons using `#7A7868`, 12px body-small text, and centered alignment. Use them for skip or low-emphasis actions.

### Chips

Interest and filter chips are pill-shaped with `999px` radius, 1px `#059669` border, horizontal padding of 12px, and 13-14px text. Unselected chips are transparent with `#1A2420` text. Selected chips use `#059669` fill and `#FBFAF2` text.

### Inputs And Selects

Inputs use a soft capsule surface: `#F2F0E6` background, `#E8E6D8` border, 48px height, 30px radius, and 16px horizontal padding. Placeholder text uses `#7A7868`; entered text uses `#1A2420`. Dropdowns include a right chevron in tertiary text color.

### Book Card

Book cards use a 136px-wide cover, 10px radius, `#F2F0E6` fallback background, and a 14px medium title label in `#4A5550`. Covers should come from Supabase Storage paths via the books database.

### Continue Reading Card

The Home hero card uses `#F2F0E6`, 20px radius, and a compact cover preview on the right. The title uses 18px medium `#1A2420`; the action text `продолжить читать` uses 14px `#059669`.

### Tab Bar

The tab bar uses `#F2F0E6` background, a 1px `#C8C6B2` top border, and four tabs: Home, Library, Search, Profile. Active labels/icons use `#1A2420`; inactive labels/icons use `#4A5550`.

### Reader

Reader chrome follows the same light system as the rest of the app:

- Background default: `#FBFAF2`
- Elevated surfaces (header controls, bottom cards, segmented wrappers): `#F2F0E6`
- Primary accent (active progress, selected actions): `#059669`
- Borders and separators: `#E8E6D8` / `#C8C6B2`
- Text hierarchy: primary `#1A2420`, secondary `#4A5550`, tertiary `#7A7868`

Typography is split by purpose:

- Reader chrome (header, segmented controls, progress labels, listen controls, modal labels) uses Inter roles from this document.
- Long-form reading content keeps `font-reader` (serif stack) for chapter titles, paragraphs, and quotes.

Reader implementation files:

- `app/reader/[bookId].tsx`
- `features/reader/components/page-elements.tsx`
- `features/reader/components/reader-bottom-reading-progress.tsx`
- `features/reader/components/reader-bottom-now-playing.tsx`
- `features/reader/components/book-listen-player.tsx`
