import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { bookCoverDesignsTable, booksTable, bookWorksTable } from "@readup/db";
import { db } from "@/db/client";
import { composeCover } from "./cover-compose";
import {
  COVER_PALETTES, COVER_PROMPT_VERSION, createCoverRecipe, textColorForPanel,
  type CoverRecipe,
} from "./cover-design";
import { coverGenerationSettings, generateBookCoverImage } from "./cover-generate";
import { sanitizeCoverError } from "./cover-prompt";
import { removeCoverFromStorage, uploadWorkCover } from "./cover-storage";
import { getBookCoversBucket, getSupabaseAdmin } from "./supabase-storage";

const SOURCE_BUCKET = "book-cover-sources";
const GENERATION_LEASE_MS = 10 * 60 * 1000;
type Row = typeof bookCoverDesignsTable.$inferSelect;

function generationActive(row: Row) {
  return row.generationState === "generating" && Date.now() - row.updatedAt.getTime() < GENERATION_LEASE_MS;
}

export class CoverConflictError extends Error {
  constructor() { super("This cover changed in another session. Reload before saving."); }
}

function recipeOf(value: Row["draftRecipe"]): CoverRecipe | null {
  return value as CoverRecipe | null;
}

async function getRow(workId: string): Promise<Row | null> {
  const [row] = await db.select().from(bookCoverDesignsTable)
    .where(eq(bookCoverDesignsTable.workId, workId)).limit(1);
  return row ?? null;
}

export async function getCoverDesign(workId: string) {
  const [work] = await db.select().from(bookWorksTable).where(eq(bookWorksTable.id, workId)).limit(1);
  if (!work) return null;
  const row = await getRow(workId);
  const stale = row?.generationState === "generating" && !generationActive(row);
  return {
    workId, activePath: work.coverImageUrl, revision: row?.revision ?? 0,
    draft: recipeOf(row?.draftRecipe ?? null),
    published: recipeOf(row?.publishedRecipe ?? null),
    hasSource: Boolean(row?.draftSourcePath),
    publishedPath: row?.publishedPath ?? null,
    generationState: stale ? "failed" : row?.generationState ?? "idle",
    error: stale ? "Previous generation stopped. Retry using the saved draft." : row?.error ?? null,
    palettes: COVER_PALETTES,
  };
}

export async function ensureCoverDraft(args: {
  workId: string; title: string; author: string;
  genres?: string[]; subjects?: string[]; bookshelves?: string[];
}): Promise<Row> {
  const existing = await getRow(args.workId);
  if (existing) return existing;
  const [work] = await db.select({ gutenbergId: bookWorksTable.gutenbergId })
    .from(bookWorksTable).where(eq(bookWorksTable.id, args.workId)).limit(1);
  if (!work) throw new Error("Book work not found.");
  const recipe = createCoverRecipe({
    identity: work.gutenbergId ? `gutenberg:${work.gutenbergId}` : `work:${args.workId}`,
    title: args.title, author: args.author,
    genres: args.genres, subjects: args.subjects, bookshelves: args.bookshelves,
  });
  await db.insert(bookCoverDesignsTable).values({
    workId: args.workId, draftRecipe: recipe as unknown as Record<string, unknown>,
  }).onConflictDoNothing();
  return (await getRow(args.workId))!;
}

function updateRecipe(recipe: CoverRecipe, input: Partial<Pick<CoverRecipe,
  "title" | "author" | "textColorMode" | "grainStrength" | "focalOffset">> & { paletteId?: string }): CoverRecipe {
  const palette = input.paletteId ? COVER_PALETTES.find((item) => item.id === input.paletteId) : recipe.palette;
  if (!palette) throw new Error("Unknown palette.");
  const title = input.title === undefined ? recipe.title : input.title;
  const author = input.author === undefined ? recipe.author : input.author;
  if (typeof title !== "string" || typeof author !== "string" || !title.trim() || !author.trim()
    || title.length > 500 || author.length > 300) {
    throw new Error("Enter a title and author within the cover text limits.");
  }
  const mode = input.textColorMode ?? recipe.textColorMode;
  if (!(["auto", "black", "white"] as const).includes(mode)) throw new Error("Invalid text color mode.");
  const grain = input.grainStrength ?? recipe.grainStrength;
  const focal = input.focalOffset ?? recipe.focalOffset;
  if (!Number.isFinite(grain) || grain < 0 || grain > 0.12 || !Number.isFinite(focal) || focal < -1 || focal > 1) {
    throw new Error("Grain or image focal offset is out of range.");
  }
  return { ...recipe, title, author, palette, textColorMode: mode,
    resolvedTextColor: textColorForPanel(palette.panel, mode), grainStrength: grain, focalOffset: focal };
}

export async function saveCoverDraft(workId: string, revision: number, input: Parameters<typeof updateRecipe>[1]) {
  const row = await getRow(workId);
  if (!row || row.revision !== revision || !row.draftRecipe) throw new CoverConflictError();
  if (generationActive(row)) throw new CoverConflictError();
  const recipe = updateRecipe(recipeOf(row.draftRecipe)!, input);
  const [saved] = await db.update(bookCoverDesignsTable).set({
    draftRecipe: recipe as unknown as Record<string, unknown>, revision: revision + 1,
    updatedAt: new Date(), error: null,
    generationState: row.generationState === "generating" ? "failed" : row.generationState,
  }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, revision))).returning();
  if (!saved) throw new CoverConflictError();
  return saved;
}

async function uploadSource(workId: string, buffer: Buffer): Promise<string> {
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error("Lower illustration is too large or empty.");
  const input = sharp(buffer, { limitInputPixels: 4096 * 4096, failOn: "error" });
  const meta = await input.metadata();
  if (!meta.format || !["png", "jpeg", "webp"].includes(meta.format)) {
    throw new Error("Use a PNG, JPEG, or WebP lower illustration.");
  }
  if (!meta.width || !meta.height || meta.width !== meta.height || meta.width < 512) {
    throw new Error("Lower illustration must be square and at least 512 × 512 pixels.");
  }
  if (meta.hasAlpha && (await input.stats()).channels[3]?.min !== 255) {
    throw new Error("The lower illustration needs its own opaque background.");
  }
  const extension = meta.format === "jpeg" ? "jpg" : meta.format;
  const path = `works/${workId}/sources/${randomUUID()}.${extension}`;
  const { error } = await getSupabaseAdmin().storage.from(SOURCE_BUCKET).upload(path, buffer, {
    contentType: meta.format === "jpeg" ? "image/jpeg" : `image/${meta.format}`, upsert: false,
  });
  if (error) throw new Error("Could not save private lower illustration.");
  return path;
}

async function sourceBytes(path: string): Promise<Buffer> {
  const { data, error } = await getSupabaseAdmin().storage.from(SOURCE_BUCKET).download(path);
  if (error || !data) throw new Error("Could not load the saved lower illustration.");
  return Buffer.from(await data.arrayBuffer());
}

export async function generateCoverSource(workId: string, args?: { title: string; author: string; subjects?: string[]; bookshelves?: string[] }) {
  let row = await getRow(workId);
  if (!row) {
    if (!args) throw new Error("Create a cover draft first.");
    row = await ensureCoverDraft({ workId, ...args });
  }
  const revision = row.revision;
  const recipe = recipeOf(row.draftRecipe)!;
  const generationRecipe = { ...recipe, ...coverGenerationSettings(), promptVersion: COVER_PROMPT_VERSION };
  if (generationActive(row)) throw new CoverConflictError();
  const [claimed] = await db.update(bookCoverDesignsTable).set({
    generationState: "generating", error: null, revision: revision + 1, updatedAt: new Date(),
  }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, revision))).returning();
  if (!claimed) throw new CoverConflictError();
  let path: string | null = null;
  try {
    const bytes = await generateBookCoverImage({
      title: recipe.title, author: recipe.author, genre: recipe.genre,
      subjects: args?.subjects ?? generationRecipe.conceptSubjects, colors: recipe.palette,
    });
    path = await uploadSource(workId, bytes);
    const [saved] = await db.update(bookCoverDesignsTable).set({
      draftSourcePath: path, generationState: "ready", error: null,
      draftRecipe: generationRecipe as unknown as Record<string, unknown>,
      revision: claimed.revision + 1, updatedAt: new Date(),
    }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, claimed.revision))).returning();
    if (!saved) throw new CoverConflictError();
    return saved;
  } catch (error) {
    if (path) await getSupabaseAdmin().storage.from(SOURCE_BUCKET).remove([path]);
    await db.update(bookCoverDesignsTable).set({
      generationState: "failed", error: sanitizeCoverError(error), updatedAt: new Date(),
    }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, claimed.revision)));
    throw error;
  }
}

export async function replaceCoverSource(workId: string, revision: number, bytes: Buffer) {
  const row = await getRow(workId);
  if (!row || row.revision !== revision) throw new CoverConflictError();
  if (generationActive(row)) throw new CoverConflictError();
  const path = await uploadSource(workId, bytes);
  const [saved] = await db.update(bookCoverDesignsTable).set({
    draftSourcePath: path, generationState: "ready", error: null,
    revision: revision + 1, updatedAt: new Date(),
  }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, revision))).returning();
  if (!saved) {
    await getSupabaseAdmin().storage.from(SOURCE_BUCKET).remove([path]);
    throw new CoverConflictError();
  }
  return saved;
}

export async function previewCover(workId: string): Promise<Buffer> {
  const row = await getRow(workId);
  if (!row?.draftRecipe || !row.draftSourcePath) throw new Error("Generate or upload a lower illustration first.");
  return composeCover(await sourceBytes(row.draftSourcePath), recipeOf(row.draftRecipe)!);
}

export async function publishCover(workId: string, revision: number, expectedActivePath: string | null) {
  const row = await getRow(workId);
  if (!row || row.revision !== revision || !row.draftRecipe || !row.draftSourcePath) throw new CoverConflictError();
  if (generationActive(row)) throw new CoverConflictError();
  const recipe = recipeOf(row.draftRecipe)!;
  const cover = await composeCover(await sourceBytes(row.draftSourcePath), recipe);
  const path = await uploadWorkCover(workId, { buffer: cover, mime: "image/png", extension: "png" });
  try {
    const { data: stored, error: downloadError } = await getSupabaseAdmin().storage
      .from(getBookCoversBucket()).download(path);
    if (downloadError || !stored) throw new Error("Uploaded cover could not be verified.");
    const storedBytes = Buffer.from(await stored.arrayBuffer());
    if (createHash("sha256").update(storedBytes).digest("hex") !== createHash("sha256").update(cover).digest("hex")) {
      throw new Error("Uploaded cover differs from the preview rendering.");
    }
    await db.transaction(async (tx) => {
      const [saved] = await tx.update(bookCoverDesignsTable).set({
        publishedRecipe: recipe as unknown as Record<string, unknown>,
        publishedSourcePath: row.draftSourcePath, publishedPath: path,
        generationState: "ready", error: null, revision: revision + 1, updatedAt: new Date(),
      }).where(and(eq(bookCoverDesignsTable.workId, workId), eq(bookCoverDesignsTable.revision, revision))).returning();
      if (!saved) throw new CoverConflictError();
      const [work] = await tx.update(bookWorksTable).set({ coverImageUrl: path, updatedAt: new Date() })
        .where(and(eq(bookWorksTable.id, workId), expectedActivePath === null
          ? isNull(bookWorksTable.coverImageUrl)
          : eq(bookWorksTable.coverImageUrl, expectedActivePath))).returning({ id: bookWorksTable.id });
      if (!work) throw new CoverConflictError();
      await tx.update(booksTable).set({ coverImageUrl: path }).where(eq(booksTable.workId, workId));
    });
    return path;
  } catch (error) {
    await removeCoverFromStorage(path);
    throw error;
  }
}

export async function getCoverSourcePreview(workId: string): Promise<Buffer> {
  const row = await getRow(workId);
  if (!row?.draftSourcePath) throw new Error("No lower illustration has been saved.");
  return sharp(await sourceBytes(row.draftSourcePath)).png().toBuffer();
}
