import { join } from "node:path";
import { existsSync } from "node:fs";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";
import { validateCoverBytes } from "./cover-image";
import { textColorForPanel, type CoverRecipe } from "./cover-design";

export const COVER_WIDTH = 1000;
export const COVER_HEIGHT = 1600;
export const COVER_PANEL_HEIGHT = 640;
const SANS_FONT = "Readup Noto Sans";
const SERIF_REGULAR_FONT = "Readup Noto Serif Regular";
const SERIF_BOLD_FONT = "Readup Noto Serif Bold";
let fontLoaded = false;

function loadFont() {
  if (fontLoaded) return;
  const fonts = [
    { paths: [join(process.cwd(), "lib", "NotoSans.ttf"), join(process.cwd(), "apps", "admin", "lib", "NotoSans.ttf")], family: SANS_FONT },
    { paths: [join(process.cwd(), "lib", "NotoSerif-Regular.woff"), join(process.cwd(), "apps", "admin", "lib", "NotoSerif-Regular.woff")], family: SERIF_REGULAR_FONT },
    { paths: [join(process.cwd(), "lib", "NotoSerif-Bold.woff"), join(process.cwd(), "apps", "admin", "lib", "NotoSerif-Bold.woff")], family: SERIF_BOLD_FONT },
  ];
  for (const { paths, family } of fonts) {
    const path = paths.find(existsSync);
    if (!path || !GlobalFonts.registerFromPath(path, family)) {
      throw new Error(`Could not load bundled ${family} font.`);
    }
  }
  fontLoaded = true;
}

function coverFont(family: CoverRecipe["titleFontFamily"], weight: "regular" | "bold") {
  if (family === "serif") return weight === "bold" ? SERIF_BOLD_FONT : SERIF_REGULAR_FONT;
  return SANS_FONT;
}

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, text: string, maxWidth: number): string[] | null {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth) return null;
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export function coverTextWarning(recipe: CoverRecipe): string | null {
  if (recipe.title.length > 75) return "Dense title: review the 136 px mobile preview.";
  return null;
}

function titleLayout(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, recipe: CoverRecipe) {
  const sizes = recipe.titleFontSize == null ? Array.from({ length: 29 }, (_, index) => 112 - index * 2) : [recipe.titleFontSize];
  for (const size of sizes) {
    ctx.font = `700 ${size}px "${coverFont(recipe.titleFontFamily, "bold")}"`;
    const lines = wrapText(ctx, recipe.title, 848);
    const lineHeight = Math.round(size * 1.13);
    if (lines && lines.length * lineHeight <= 365) return { size, lines, lineHeight };
  }
  throw new Error("The cover title does not fit at this size. Choose Auto fit, a smaller size, or a shorter title.");
}

function renderText(recipe: CoverRecipe): Buffer {
  loadFont();
  if (!recipe.title.trim() || !recipe.author.trim()) {
    throw new Error("Cover display title and author are required.");
  }
  if ([recipe.title, recipe.author].some((value) => value !== value.trim() || /\s{2,}|[^\S ]/u.test(value))) {
    throw new Error("Cover display text contains extra spacing or line breaks. Edit it before previewing.");
  }
  const canvas = createCanvas(COVER_WIDTH, COVER_PANEL_HEIGHT);
  const ctx = canvas.getContext("2d");
  const color = textColorForPanel(recipe.palette.panel, recipe.textColorMode);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const title = titleLayout(ctx, recipe);
  ctx.font = `700 ${title.size}px "${coverFont(recipe.titleFontFamily, "bold")}"`;
  title.lines.forEach((line, index) => ctx.fillText(line, 76, 76 + index * title.lineHeight));

  const authorTop = Math.max(492, 76 + title.lines.length * title.lineHeight + 36);
  let authorLines: string[] | null = null;
  let authorSize = 46;
  const authorSizes = recipe.authorFontSize == null ? Array.from({ length: 9 }, (_, index) => 46 - index * 2) : [recipe.authorFontSize];
  for (const size of authorSizes) {
    authorSize = size;
    ctx.font = `400 ${authorSize}px "${coverFont(recipe.authorFontFamily, "regular")}"`;
    authorLines = wrapText(ctx, recipe.author, 848);
    if (authorLines && authorTop + authorLines.length * Math.round(authorSize * 1.2) <= 575) break;
    authorLines = null;
  }
  if (!authorLines) {
    throw new Error("The cover author does not fit at this size. Choose Auto fit, a smaller size, or a shorter name.");
  }
  ctx.font = `400 ${authorSize}px "${coverFont(recipe.authorFontFamily, "regular")}"`;
  authorLines.forEach((line, index) => ctx.fillText(line, 76, authorTop + index * Math.round(authorSize * 1.2)));
  return canvas.toBuffer("image/png");
}

function seededGrain(seed: number, strength: number): Buffer | null {
  if (strength <= 0) return null;
  const bounded = Math.min(0.12, Math.max(0, strength));
  const pixels = Buffer.alloc(COVER_WIDTH * COVER_HEIGHT * 4);
  let state = seed >>> 0;
  for (let i = 0; i < pixels.length; i += 4) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const value = state >>> 0;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value & 1 ? 255 : 0;
    pixels[i + 3] = Math.round(((value >>> 8) & 255) / 255 * bounded * 255);
  }
  return pixels;
}

/** The sole compositor for admin previews and published PNGs. */
export async function composeCover(source: Buffer, recipe: CoverRecipe): Promise<Buffer> {
  if (!source.length) throw new Error("Generate or upload a lower illustration first.");
  const normalized = await sharp(source).rotate().resize(1000, 1000, { fit: "cover" }).png().toBuffer();
  const normalizedImage = sharp(normalized);
  const metadata = await normalizedImage.metadata();
  if (metadata.hasAlpha && (await normalizedImage.stats()).channels[3]?.min !== 255) {
    throw new Error("The lower illustration needs its own opaque background.");
  }
  const offset = Math.min(1, Math.max(-1, recipe.focalOffset));
  const top = Math.round((1000 - 960) * (offset + 1) / 2);
  const lower = await sharp(normalized).extract({ left: 0, top, width: 1000, height: 960 }).toBuffer();
  const text = renderText(recipe);
  let cover = await sharp({
    create: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4, background: recipe.palette.panel },
  }).composite([
    { input: lower, top: COVER_PANEL_HEIGHT, left: 0 },
    { input: text, top: 0, left: 0 },
  ]).png({ compressionLevel: 9 }).toBuffer();
  const grain = seededGrain(recipe.grainSeed, recipe.grainStrength);
  if (grain) cover = await sharp(cover).composite([{ input: grain, raw: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4 }, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
  const validated = validateCoverBytes(cover, "image/png");
  if (!validated.ok) throw new Error(validated.message);
  return cover;
}
