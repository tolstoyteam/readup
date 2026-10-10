export function buildCoverPrompt(args: {
  title: string;
  author: string;
  subjects?: string[];
}): string {
  const title = args.title.trim() || "Untitled";
  const author = args.author.trim() || "Unknown Author";
  const subjects = (args.subjects ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");

  const themeLine = subjects
    ? `Genre / themes (for atmosphere only): ${subjects}`
    : "Infer genre and atmosphere from the title and author.";

  return `Create a distinctive, professional book cover for a mobile reading app.

Book title: ${title}
Author: ${author}
${themeLine}

Create an original visual concept inspired by the book's subject, themes, atmosphere, and genre. The design should be visually striking, polished, recognizable at small mobile-screen sizes, and clearly distinguishable from other book covers in the library.

Do not depict, imitate, or include photographs or recognizable likenesses of public figures. Do not copy an existing book cover, copyrighted cover artwork, or another artist's specific style. Create an original composition.

Use a portrait book-cover composition with a 5:8 aspect ratio (width:height = 1000:1600). Use thoughtful typography, a clear visual hierarchy, balanced composition, and appropriate colors. Include the exact book title and author name only if you can render them accurately. Do not invent subtitles, author names, awards, publisher logos, or other text. Avoid unnecessary decorative text, watermarks, and mockup scenes.

The result must be a finished, original book-cover image suitable for direct use as the cover in a mobile reading app, not a picture of a physical book.`;
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
