import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Svg, { Path } from "react-native-svg";

import { useReadupColors } from "@/shared/constants/readup-theme";

export function SocialProviderIcon({ provider }: { provider: "apple" | "google" }) {
  const colors = useReadupColors();

  if (provider === "apple") {
    return <FontAwesome5 name="apple" brand size={20} color={colors.text} />;
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21.35 11.1H12v3.8h5.35c-.23 1.25-.94 2.3-2 3.01v2.51h3.24c1.9-1.75 3-4.33 3-7.42 0-.63-.08-1.23-.24-1.9z" />
      <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.59-2.44l-3.24-2.51c-.9.6-2.04.95-3.35.95-2.58 0-4.76-1.74-5.54-4.08H3.12v2.58A10 10 0 0012 22z" />
      <Path fill="#FBBC05" d="M6.46 13.92A6 6 0 016.15 12c0-.67.12-1.31.31-1.92V7.5H3.12A10 10 0 002 12c0 1.61.38 3.13 1.12 4.5l3.34-2.58z" />
      <Path fill="#EA4335" d="M12 6c1.43 0 2.71.49 3.72 1.48l2.79-2.79A10 10 0 0012 2 10 10 0 003.12 7.5l3.34 2.58C7.24 7.74 9.42 6 12 6z" />
    </Svg>
  );
}
