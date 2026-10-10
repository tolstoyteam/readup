import "server-only";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { truncateSourceText } from "@/lib/book-source-text";
import { withExponentialBackoff } from "@/lib/retry";

const DEFAULT_MODEL = process.env.BOOK_AI_MODEL ?? "gpt-4o-mini";
/** Match existing generation context budget. */
const SOURCE_CHAR_LIMIT = 80_000;
/** Chunk size for map phase; leave room for prompt overhead. */
const MAP_CHUNK_CHARS = 28_000;
/** Cap map calls so a single import step stays within function time limits. */
const MAX_MAP_CHUNKS = 8;

function openai() {
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function splitIntoChunks(text: string, chunkSize: number, maxChunks: number): string[] {
  const cleaned = text.replace(/\r\n?/g, "\n").trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  const total = cleaned.length;
  const step = Math.ceil(total / Math.min(maxChunks, Math.ceil(total / chunkSize)));

  for (let start = 0; start < total && chunks.length < maxChunks; start += step) {
    let end = Math.min(start + step, total);
    // Prefer breaking on paragraph boundaries.
    if (end < total) {
      const window = cleaned.slice(start, Math.min(end + 500, total));
      const breakAt = window.lastIndexOf("\n\n");
      if (breakAt > chunkSize * 0.4) {
        end = start + breakAt;
      }
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece.slice(0, chunkSize));
  }

  return chunks;
}

async function summarizeChunk(args: {
  chunkIndex: number;
  totalChunks: number;
  title: string;
  author: string;
  text: string;
}): Promise<string> {
  const model = openai()(DEFAULT_MODEL);
  const result = await withExponentialBackoff(
    () =>
      generateText({
        model,
        system: `You condense public-domain book excerpts for a later short-book rewrite.
Preserve: major plot/argument arcs, key characters or concepts, important examples, turning points, and the ending of this section.
Do not invent content. Write dense prose (not bullet lists unless necessary). Aim for 400–700 words.`,
        prompt: [
          `Book: ${args.title}`,
          `Author: ${args.author}`,
          `Section ${args.chunkIndex + 1} of ${args.totalChunks}`,
          "---",
          args.text,
        ].join("\n"),
      }),
    { maxAttempts: 3, label: `gutenberg-map-${args.chunkIndex}` },
  );
  return result.text.trim();
}

/**
 * Prepare Gutenberg full text for the existing book-generation pipeline.
 * Short texts pass through truncation; long texts are map/reduced so the
 * whole work is represented rather than only the opening chapters.
 */
export async function prepareGutenbergSourceText(args: {
  title: string;
  author: string;
  text: string;
  gutenbergId: number;
}): Promise<{ filename: string; text: string }> {
  const filename = `gutenberg-${args.gutenbergId}.txt`;
  const cleaned = args.text.replace(/\r\n?/g, "\n").trim();

  if (!cleaned) {
    throw new Error("Gutenberg book text is empty.");
  }

  // Full download is already in memory. Only condense for the LLM payload —
  // never truncate the Gutenberg fetch before map/reduce.
  if (cleaned.length <= SOURCE_CHAR_LIMIT) {
    return { filename, text: cleaned };
  }

  console.info("[gutenberg] preparing long source via map/reduce", {
    gutenbergId: args.gutenbergId,
    chars: cleaned.length,
  });

  const chunks = splitIntoChunks(cleaned, MAP_CHUNK_CHARS, MAX_MAP_CHUNKS);
  const sectionSummaries: string[] = [];

  // Sequential map to respect AI rate limits within one advance step.
  for (let i = 0; i < chunks.length; i += 1) {
    const summary = await summarizeChunk({
      chunkIndex: i,
      totalChunks: chunks.length,
      title: args.title,
      author: args.author,
      text: chunks[i]!,
    });
    sectionSummaries.push(`## Section ${i + 1}\n${summary}`);
  }

  const model = openai()(DEFAULT_MODEL);
  const reduced = await withExponentialBackoff(
    () =>
      generateText({
        model,
        system: `You merge section condensations of a public-domain book into one coherent source brief
for writing a short advanced reading summary. Cover the entire work in order. Keep important
ideas, arguments, examples, and structure. Do not invent plot. Target 3_000–6_000 words of dense prose.`,
        prompt: [
          `Book: ${args.title}`,
          `Author: ${args.author}`,
          "Section condensations:",
          "---",
          sectionSummaries.join("\n\n"),
        ].join("\n"),
      }),
    { maxAttempts: 3, label: "gutenberg-reduce" },
  );

  const brief = reduced.text.trim();
  if (!brief) {
    // Fallback: evenly sample original text rather than only the start.
    const sample = sampleAcrossBook(cleaned, SOURCE_CHAR_LIMIT);
    return { filename, text: sample };
  }

  return {
    filename,
    text: truncateSourceText(
      [
        `Whole-book condensation of "${args.title}" by ${args.author} (Project Gutenberg #${args.gutenbergId}).`,
        "Use this as faithful source material spanning the entire work.",
        "---",
        brief,
      ].join("\n\n"),
      SOURCE_CHAR_LIMIT,
    ),
  };
}

function sampleAcrossBook(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const third = Math.floor(maxChars / 3) - 40;
  const start = text.slice(0, third);
  const midStart = Math.floor(text.length / 2) - Math.floor(third / 2);
  const mid = text.slice(midStart, midStart + third);
  const end = text.slice(-third);
  return [
    start,
    "\n\n[...middle excerpt...]\n\n",
    mid,
    "\n\n[...ending excerpt...]\n\n",
    end,
  ].join("");
}
