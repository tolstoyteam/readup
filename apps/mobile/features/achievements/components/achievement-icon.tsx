import {
  BookMarked,
  BookOpen,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";

const ICON_BY_NAME: Record<string, LucideIcon> = {
  BookOpen,
  BookMarked,
  Flame,
  Trophy,
  Sparkles,
  Clock,
};

type AchievementIconProps = {
  name: string;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export function AchievementIcon({
  name,
  size = 22,
  color,
  strokeWidth = 2.2,
}: AchievementIconProps) {
  const Icon = ICON_BY_NAME[name] ?? Trophy;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
