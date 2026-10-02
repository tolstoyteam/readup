# Welcome screen

This document describes the welcome screen as currently implemented in [`welcome-screen.tsx`](../features/intro/screens/welcome-screen.tsx). The Expo Router page is `app/(intro)/welcome.tsx`.

## Layout and content

The screen has a cream background, a small centered Readup wordmark, a centered two-line headline, a welcome illustration, and one button at the bottom. A large Readup logo image is positioned behind the content as a watermark. The watermark does not receive touches or accessibility focus.

The layout uses a 402 × 874 Figma frame as its reference. The wordmark is 66 × 18 px. The headline starts 48 px below it and is limited to 320 px wide. The illustration keeps its 318:426 aspect ratio; its height is capped at 36% of the window height, and its corners have a 12 px radius. The bottom button is at least 54 px tall, at most 338 px wide, and has 48 px plus the device's bottom inset below it. The top safe area is handled by `SafeAreaView`.

There is no sign-in button on this screen. The headline and button label are localized through `welcome.title` and `welcome.start`. Current button labels are “Начать” in Russian, “Continue” in English, and “Empezar” in Spanish.

## Typography and colors

The screen loads Inter before rendering its content. These are the styles in the current implementation, including values that differ from `design.md`:

| Element | Style |
| --- | --- |
| Headline | Inter ExtraBold 800, 34 px, 38 px line height, −1.36 px tracking, centered |
| Button label | Inter Medium 500, 18 px, −0.72 px tracking |

| Element | Light mode | Dark mode |
| --- | --- | --- |
| Screen background (`background`) | `#FBFAF2` | `#101512` |
| Wordmark and headline (`brand`) | `#059669` | `#34D399` |
| Button fill (`brandDark`) | `#047857` | `#10B981` |
| Button border (`brand`) | `#059669` | `#34D399` |
| Button text | `#FBFAF2` | `#FBFAF2` |

The button has a 1 px border and a 100 px corner radius, giving it a capsule shape. The watermark is shown at full opacity in light mode and 18% opacity in dark mode.

## Interaction and accessibility

Pressing the button pushes `/information`. It does not mark the information slides complete; that happens when the user skips or finishes those slides. While the fonts load, a centered activity indicator appears in the brand color.

The button has an accessibility role and a localized accessibility label. Its pressed state reduces opacity to 92%. The watermark and illustration are non-interactive. The status bar uses dark content in light mode and light content in dark mode.
