import "server-only";

import OpenAI from "openai";
import { buildCoverPrompt } from "@/lib/cover-prompt";
import { withExponentialBackoff } from "@/lib/retry";

export { buildCoverPrompt, sanitizeCoverError } from "@/lib/cover-prompt";

const DEFAULT_MODEL = "gpt-image-1";
const DEFAULT_QUALITY = "low";
const DEFAULT_SIZE = "1024x1536" as const;

let activeCoverGens = 0;
const coverGenWaiters: Array<() => void> = [];

function coverGenConcurrency(): number {
  const raw = process.env.COVER_GEN_CONCURRENCY?.trim();
  const n = raw ? Number(raw) : 2;
  return Number.isFinite(n) && n >= 1 ? Math.min(8, Math.floor(n)) : 2;
}

async function withCoverGenSlot<T>(fn: () => Promise<T>): Promise<T> {
  const max = coverGenConcurrency();
  while (activeCoverGens >= max) {
    await new Promise<void>((resolve) => {
      coverGenWaiters.push(resolve);
    });
  }
  activeCoverGens += 1;
  try {
    return await fn();
  } finally {
    activeCoverGens -= 1;
    const next = coverGenWaiters.shift();
    next?.();
  }
}

function imageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function imageQuality(): "low" | "medium" | "high" | "auto" {
  const q = (process.env.OPENAI_IMAGE_QUALITY?.trim() || DEFAULT_QUALITY).toLowerCase();
  if (q === "medium" || q === "high" || q === "auto" || q === "low") return q;
  return DEFAULT_QUALITY;
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download generated cover image (${res.status}).`);
  }
  const ab = await res.arrayBuffer();
  if (!ab.byteLength) {
    throw new Error("Generated cover image download was empty.");
  }
  return Buffer.from(ab);
}

/**
 * Generate a book cover image via OpenAI Images API.
 * Returns raw image bytes (PNG/JPEG/WebP depending on the model).
 */
export async function generateBookCoverImage(args: {
  title: string;
  author: string;
  subjects?: string[];
}): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for cover generation.");
  }

  const prompt = buildCoverPrompt(args);
  const model = imageModel();
  const quality = imageQuality();
  const openai = new OpenAI({ apiKey });

  return withCoverGenSlot(() =>
    withExponentialBackoff(
      async () => {
        const response = await openai.images.generate({
          model,
          prompt,
          n: 1,
          size: DEFAULT_SIZE,
          quality,
        });

        const item = response.data?.[0];
        if (!item) {
          throw new Error("Image generation returned no image data.");
        }

        if (typeof item.b64_json === "string" && item.b64_json.length > 0) {
          return Buffer.from(item.b64_json, "base64");
        }

        if (typeof item.url === "string" && item.url.trim()) {
          return fetchImageBytes(item.url.trim());
        }

        throw new Error("Image generation response missing b64_json and url.");
      },
      {
        maxAttempts: 4,
        baseDelayMs: 1500,
        maxDelayMs: 20_000,
        label: "cover_image_generate",
        onRetry: ({ attempt, maxAttempts, delayMs }) => {
          console.warn(
            `[cover_generate] retry ${attempt}/${maxAttempts} in ~${delayMs}ms`,
          );
        },
      },
    ),
  );
}
