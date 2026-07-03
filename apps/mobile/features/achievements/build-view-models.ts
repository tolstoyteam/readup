import {
  ACHIEVEMENT_DEFINITION_BY_SLUG,
  ACHIEVEMENT_DEFINITIONS,
} from "@/features/achievements/definitions";
import {
  calculateProgress,
  isAchievementUnlocked,
} from "@/features/achievements/calculate-progress";
import type {
  AchievementStats,
  AchievementViewModel,
} from "@/features/achievements/types";
import {
  achievementCatalogDescription,
  achievementCatalogTitle,
  type AchievementCatalogItem,
  type AchievementUnlock,
} from "@/features/achievements/api/achievements";
import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

export function buildAchievementViewModels(
  catalog: AchievementCatalogItem[],
  unlocks: AchievementUnlock[],
  stats: AchievementStats,
  language: InterfaceLanguage,
): AchievementViewModel[] {
  const unlockBySlug = new Map(
    unlocks.map((row) => [row.slug, row.unlockedAt] as const),
  );
  const unlockedSlugs = new Set(unlocks.map((row) => row.slug));

  const rows = catalog.length > 0 ? catalog : fallbackCatalogFromDefinitions();

  return rows
    .map((item) => {
      const definition = ACHIEVEMENT_DEFINITION_BY_SLUG.get(item.slug);
      if (!definition) return null;

      const progress = calculateProgress(definition, stats);
      const unlockedAt = unlockBySlug.get(item.slug) ?? null;
      const isUnlocked = isAchievementUnlocked(
        definition,
        stats,
        unlockedSlugs,
      );

      return {
        id: item.id,
        slug: item.slug,
        title: achievementCatalogTitle(item, language),
        description: achievementCatalogDescription(item, language),
        icon: item.icon,
        sortOrder: item.sortOrder,
        category: definition.category,
        isUnlocked,
        unlockedAt,
        progress,
      };
    })
    .filter((row): row is AchievementViewModel => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function fallbackCatalogFromDefinitions(): AchievementCatalogItem[] {
  return ACHIEVEMENT_DEFINITIONS.map((def, index) => ({
    id: index + 1,
    slug: def.slug,
    title: def.title,
    titleEn: def.titleEn,
    description: def.description,
    descriptionEn: def.descriptionEn,
    icon: def.icon,
    sortOrder: def.sortOrder,
  }));
}
