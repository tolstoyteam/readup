/** Height ÷ width — portrait cover matching the app's book cards. */
import { COVER_HEIGHT_WIDTH_RATIO } from "./cover-dimensions";
export { COVER_HEIGHT_WIDTH_RATIO };
export const COVER_RATIO_TOLERANCE = 0.02;

export function isCoverAspectRatio(height: number, width: number): boolean {
  if (!(width > 0 && height > 0)) return false;
  const r = height / width;
  return Math.abs(r - COVER_HEIGHT_WIDTH_RATIO) <= COVER_RATIO_TOLERANCE;
}
