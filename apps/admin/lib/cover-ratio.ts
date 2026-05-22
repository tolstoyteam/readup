/** Height ÷ width — portrait cover (e.g. 1600×1000). */
export const COVER_HEIGHT_WIDTH_RATIO = 1.6;
export const COVER_RATIO_TOLERANCE = 0.02;

export function isCoverAspectRatio(height: number, width: number): boolean {
  if (!(width > 0 && height > 0)) return false;
  const r = height / width;
  return Math.abs(r - COVER_HEIGHT_WIDTH_RATIO) <= COVER_RATIO_TOLERANCE;
}
