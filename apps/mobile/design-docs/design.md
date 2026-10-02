# Readup Design System

This file defines the reusable mobile UI system for Readup.

The Figma file is the visual reference. The app implements the system in React Native with Expo Router and NativeWind.

Shared design tokens should live in:

`shared/constants/readup-theme.ts`

Avoid redefining repeated colors, spacing, typography, and component styles inside individual screens.

---

## Colors

### Base palette

| Token | Hex |
| --- | --- |
| `green600` | `#059669` |
| `green700` | `#047857` |
| `cream50` | `#FBFAF2` |
| `cream100` | `#F2F0E6` |
| `cream200` | `#E8E6D8` |
| `cream300` | `#C8C6B2` |
| `ink900` | `#1A2420` |
| `ink700` | `#4A5550` |
| `ink500` | `#7A7868` |

### Semantic colors

```ts
export const ReadupColors = {
  background: "#FBFAF2",

  surface: "#F2F0E6",
  surfaceElevated: "#E8E6D8",

  textPrimary: "#1A2420",
  textSecondary: "#4A5550",
  textTertiary: "#7A7868",
  textInverse: "#FBFAF2",

  accent: "#059669",
  accentPressed: "#047857",

  borderSubtle: "#E8E6D8",
  borderDefault: "#C8C6B2",

  selectionBackground: "#059669",
  progressActive: "#059669",
} as const;
```

### Usage

- `textPrimary`: page titles, section headings, book titles, important content
- `textSecondary`: authors, descriptions, secondary labels
- `textTertiary`: placeholders, helper text, low-emphasis metadata
- `accent`: primary actions, selected controls, progress, interactive emphasis

Do not use green as the default heading color.

---

## Typography

Use Inter for interface UI.

| Token | Size | Weight | Line Height | Tracking |
| --- | ---: | ---: | ---: | ---: |
| `display` | 34 | 800 | 40 | `-1px` |
| `titleLarge` | 28 | 700 | 34 | `-0.6px` |
| `titleMedium` | 22 | 600 | 28 | `-0.3px` |
| `titleSmall` | 18 | 600 | 24 | `-0.2px` |
| `bodyLarge` | 16 | 400 | 24 | `0` |
| `body` | 14 | 400 | 21 | `0` |
| `label` | 14 | 500 | 20 | `0` |
| `bodySmall` | 12 | 400 | 18 | `0` |

Negative tracking should only be used for larger typography.

Interactive text should generally be at least 14px.

---

## Reader Typography

Reader content uses `font-reader`.

| Token | Size | Weight | Line Height |
| --- | ---: | ---: | ---: |
| `readerTitle` | 30 | 600 | 38 |
| `readerHeading` | 22 | 600 | 30 |
| `readerBody` | 18 | 400 | 29 |
| `readerQuote` | 18 | 400 | 29 |
| `readerCaption` | 13 | 400 | 19 |

Reader UI chrome continues to use Inter.

Recommended reader horizontal padding:

`20–24px`

Recommended paragraph spacing:

`16–20px`

---

## Spacing

Use a 4px-based spacing scale.

```ts
export const ReadupSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
```

Default screen horizontal padding:

`20px`

Minimum on compact screens:

`16px`

Typical spacing:

- page title → content: `24px`
- section → section: `32px`
- section heading → content: `16px`
- card → card: `12–16px`
- label → field: `8px`

Avoid arbitrary spacing values unless visually necessary.

---

## Radius

```ts
export const ReadupRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  pill: 999,
} as const;
```

Recommended usage:

| Component | Radius |
| --- | ---: |
| Book cover | `8–10px` |
| Input | `16px` |
| Button | `16px` |
| Card | `16–20px` |
| Bottom sheet | `24px` top corners |
| Chip | Pill |

Do not make every component capsule-shaped.

---

# Components

## Primary Button

```text
height: 54px
background: accent
pressed background: accentPressed
radius: 16px
text: textInverse
typography: label
border: none
```

States:

- default
- pressed
- disabled
- loading

Preserve button dimensions while loading.

---

## Secondary Button

```text
height: 48–54px
background: surface
border: 1px borderSubtle
radius: 16px
text: textPrimary
```

---

## Text Button

Use for low-emphasis actions.

```text
text: textTertiary or accent
typography: label
minimum touch target: 44x44px
```

---

## Chips

```text
radius: pill
border: 1px accent
horizontal padding: 12px
vertical padding: 8px
typography: body / label
```

Unselected:

```text
background: transparent
text: textPrimary
```

Selected:

```text
background: accent
text: textInverse
```

Support:

- default
- pressed
- selected
- disabled

---

## Inputs

```text
height: 48–52px
background: surface
border: 1px borderSubtle
radius: 16px
horizontal padding: 16px
text: textPrimary
placeholder: textTertiary
```

States:

- default
- focused
- filled
- error
- disabled

Focused inputs should use an accent border or equivalent visible focus treatment.

---

## Select

Uses input styling.

Right chevron:

```text
size: 18–20px
color: textTertiary
```

The full row must be tappable.

---


## Continue Reading Card

```text
background: surface
radius: 20px
padding: 16–20px
```

Title:

```text
titleSmall
textPrimary
```

Action/progress:

```text
label
accent
```

---

## Tab Bar

Tabs:

- Home
- Library
- Search
- Profile

```text
background: surface
top border: 1px borderDefault
```

Active state:

```text
text/icon: textPrimary or accent
```

Inactive state:

```text
text/icon: textSecondary
```

Choose one active-state approach and use it consistently.

Account for the device bottom safe area.

---

## Icons

Use one icon library consistently.

Recommended sizes:

```text
compact: 16px
default: 20px
navigation: 22–24px
```

Icon-only buttons must have:

- minimum 44x44px touch target
- accessibility label
- pressed state

---

## Segmented Control

```text
wrapper:
  background: surface
  radius: 16px
  padding: 4px

selected:
  background: background
  text: textPrimary
```

---

## Bottom Sheet

```text
background: background
top radius: 24px
horizontal padding: 20px
```

Use for contextual mobile actions where appropriate.

---

# Surfaces

Use tonal hierarchy instead of shadows by default.

```text
app background → background
standard card → surface
elevated/floating surface → surfaceElevated
```

Standard cards should not require shadows.

Use shadows only for genuinely floating UI such as:

- menus
- sheets
- floating player controls
- overlays

---

# Reader

Reader colors:

```text
background: background
chrome: surface
borders: borderSubtle
active controls: accent
text: textPrimary / textSecondary / textTertiary
```


---

# Interaction States

Reusable interactive components should define relevant states.

Consider:

```text
default
pressed
focused
selected
disabled
loading
error
```

Not every component needs every state.

Do not implement only the static Figma state.

---

# Accessibility

Minimum effective touch target:

`44x44px`

Requirements:

- icon-only actions have accessibility labels
- meaning is not communicated by color alone
- important text can wrap
- layouts should tolerate system font scaling
- safe areas must be respected
- reduced-motion settings should be respected where possible

Recommended truncation:

```text
Book cards: title up to 2 lines
Compact rows: 1–2 lines
Authors may truncate before titles
```

---

# Motion

Recommended durations:

```text
fast: 120–160ms
standard: 180–240ms
slow: 280–360ms
```

Use motion for:

- pressed feedback
- selections
- sheets
- navigation
- progress
- player expansion

Avoid decorative motion that delays interaction.

---

# Implementation Rules

Prefer reusable components and semantic tokens over repeated inline styling.

Prefer:

```tsx
<Button variant="primary" />
```

over:

```tsx
<View className="h-[54px] rounded-[16px] bg-[#059669]" />
```

NativeWind is appropriate for layout utilities:

```tsx
<View className="flex-row items-center gap-3" />
```

Repeated product styling should be extracted into shared components or tokens.

Avoid hard-coded brand colors inside feature components.

Use semantic names such as:

```text
textPrimary
surface
accent
space4
radiusLarge
readerBody
```

rather than:

```text
darkGreen
lightCream
grayText
bigRadius
```

---
