import imageSize from "image-size";
import { COVER_HEIGHT_WIDTH_RATIO, COVER_RATIO_TOLERANCE, isCoverAspectRatio } from "@/lib/cover-ratio";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/svg+xml": "svg",
};

function isSvgBuffer(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(512, buf.length)).toString("utf8").trimStart();
  return head.startsWith("<svg") || head.startsWith("<?xml");
}

/** Detect PNG / JPEG / SVG from bytes only (do not trust Content-Type). */
function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (isSvgBuffer(buf)) {
    return "image/svg+xml";
  }
  return null;
}

export type CoverValidationOk = {
  ok: true;
  mime: string;
  extension: string;
  width: number;
  height: number;
};

export type CoverValidationErr = { ok: false; message: string };

export function validateCoverBytes(
  buffer: Buffer,
  _declaredMime: string,
): CoverValidationOk | CoverValidationErr {
  const mime = sniffMime(buffer);
  if (!mime) {
    return {
      ok: false,
      message:
        "Only PNG, JPEG, or SVG files are accepted (this file doesn't match those formats).",
    };
  }
  const extension = EXT_BY_MIME[mime];
  if (!extension) {
    return { ok: false, message: "Unsupported image format for the cover." };
  }

  let width: number;
  let height: number;
  try {
    const dim = imageSize(buffer);
    width = dim.width ?? 0;
    height = dim.height ?? 0;
  } catch {
    return {
      ok: false,
      message: "Could not read image dimensions — the file may be corrupted or not a valid image.",
    };
  }

  if (!isCoverAspectRatio(height, width)) {
    return {
      ok: false,
      message: `Height ÷ width must be ${COVER_HEIGHT_WIDTH_RATIO} (±${COVER_RATIO_TOLERANCE}). This image is ${height}×${width}px.`,
    };
  }

  return { ok: true, mime, extension, width, height };
}
