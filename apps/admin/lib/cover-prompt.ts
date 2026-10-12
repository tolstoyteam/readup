export function buildCoverPrompt(args: {
  title: string;
  author: string;
  genre?: string;
  subjects?: string[];
  colors?: { imageBackground: string; accent: string; secondary: string };
}): string {
  const title = args.title.trim() || "Untitled";
  const author = args.author.trim() || "Unknown Author";
  const subjects = (args.subjects ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");

  const themeLine = subjects ? `Relevant subjects: ${subjects}` : "Use the genre for concept context.";

  return `Editorial illustration prompt version 2. Create one original, minimal expressive illustration for the LOWER image of a two-part book cover.

Book title: ${title}
Author: ${author}
Genre: ${args.genre ?? "other"}
${themeLine}
Image background: ${args.colors?.imageBackground ?? "warm neutral"}
Primary accent: ${args.colors?.accent ?? "muted red"}
Secondary color: ${args.colors?.secondary ?? "slate blue"}

Create a single clear visual idea inspired by these details. Make a complete square image with its own background using the named palette colors, restrained shapes, and subtle print texture. It must read clearly at small mobile sizes. Leave no blank panel for typography.

Do not depict recognizable public figures. Do not copy or imitate an existing book cover, copyrighted cover artwork, or another artist's specific style.

No text, letters, numerals, typography, logos, watermarks, book mockups, or pictures of a physical book. The title and author are concept context only and will be typeset separately by the application.`;
}

/** Sanitize errors for admin UI — never leak keys or full provider payloads. */
export function sanitizeCoverError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Cover generation failed.";
  }
  let msg = error.message.replace(/\s+/g, " ").trim();
  msg = msg.replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]");
  msg = msg.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  if (msg.length > 240) {
    msg = `${msg.slice(0, 237)}...`;
  }
  return msg || "Cover generation failed.";
}
