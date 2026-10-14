import sharp from "sharp";
import { validateCoverBytes } from "@/lib/cover-image";
import { COVER_HEIGHT, COVER_WIDTH } from "./cover-dimensions";

export type NormalizedCover = {
  buffer: Buffer;
  mime: string;
  extension: string;
};

/** Target portrait cover size (25:36 width:height). */
export const COVER_TARGET_WIDTH = COVER_WIDTH;
export const COVER_TARGET_HEIGHT = COVER_HEIGHT;

/**
 * Decode any common raster format, center-cover-crop to 1000×1440, emit PNG,
 * and validate against the existing cover rules.
 */
export async function normalizeCoverImage(buffer: Buffer): Promise<NormalizedCover> {
  if (!buffer?.length) {
    throw new Error("Generated cover image is empty.");
  }

  let png: Buffer;
  try {
    png = await sharp(buffer)
      .rotate()
      .resize(COVER_TARGET_WIDTH, COVER_TARGET_HEIGHT, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process cover image: ${message}`);
  }

  const validated = validateCoverBytes(png, "image/png");
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  return {
    buffer: png,
    mime: validated.mime,
    extension: validated.extension,
  };
}
