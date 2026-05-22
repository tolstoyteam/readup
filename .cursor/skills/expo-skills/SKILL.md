---
name: expo-skills
description: Routes Expo and React Native work to Expo’s official agent skills (Expo Router, UI, data fetching, EAS, CI/CD, deployment, SDK upgrades). Use when building or debugging Expo apps, EAS Build/Submit/Workflows, App Store or Play releases, NativeWind/Tailwind in Expo, DOM components, or when the user mentions expo/skills or wants Expo best practices from the official repo.
---

# Expo official skills (expo/skills)

The Expo team maintains skills at [github.com/expo/skills](https://github.com/expo/skills). They ship as `plugins/expo/skills/<skill-name>/SKILL.md` with optional `references/` and `scripts/`.

## Install in Cursor (recommended)

1. Open **Cursor Settings** (macOS: Cmd+Shift+J, Windows/Linux: Ctrl+Shift+J).
2. Go to **Rules & Command** → **Project Rules** → **Add Rule** → **Remote Rule (GitHub)**.
3. Enter: `https://github.com/expo/skills.git`

The agent discovers skills by description; they do **not** appear in the `/` command menu (that menu is for `.cursor/commands/`, not skills).

**Verify:** Ask something like “How do I structure routes in Expo Router?” or “How do I submit to TestFlight with EAS?” — answers should follow the official skill content.

## If the remote rule is unavailable

Read the matching skill from the repo (replace `<skill>` with a name from the table below):

`https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/<skill>/SKILL.md`

Follow `references/` links from that `SKILL.md` as needed (same base path under `plugins/expo/skills/<skill>/references/`).

## Skill router

| User intent | Skill folder (`<skill>`) |
|-------------|--------------------------|
| Expo Router UI, navigation, animations, native controls, tabs, media | `building-native-ui` |
| API routes + EAS Hosting | `expo-api-routes` |
| Custom dev client builds / distribution | `expo-dev-client` |
| Tailwind v4 + NativeWind v5 setup | `expo-tailwind-setup` |
| Jetpack Compose UI in Expo | `expo-ui-jetpack-compose` |
| SwiftUI in Expo | `expo-ui-swift-ui` |
| Networking, caching, offline, Router loaders | `native-data-fetching` |
| DOM components / web code in native | `use-dom` |
| App Store, Play Store, TestFlight, EAS submit, web hosting | `expo-deployment` |
| EAS Workflow YAML (CI/CD) | `expo-cicd-workflows` |
| Expo SDK upgrade, deprecations, dependency fixes | `upgrading-expo` |

## Other agents (optional)

To extract skills as separate installable copies (manual upgrades): `bunx skills add expo/skills` (see upstream [README](https://github.com/expo/skills/blob/main/README.md)).

## License

Upstream skills are MIT; attribution remains with the Expo team.
