import "server-only";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const TEXT_EXTENSIONS = /\.(txt|md|markdown)$/i;
const PDF_EXTENSION = /\.pdf$/i;

export const SUPPORTED_SOURCE_DESCRIPTION = ".txt, .md, or .pdf";

export type ExtractedSource = {
  text: string;
  /** Original file name (useful for prompt context). */
  filename: string;
};

/**
 * Read a user-uploaded source file and return its plain text contents.
 * Supports plain text (.txt / .md) and PDFs.
 */
export async function extractSourceText(file: File): Promise<ExtractedSource> {
  if (file.size <= 0) {
    throw new Error("Source file is empty.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source file is too large (max ${Math.floor(MAX_SOURCE_BYTES / 1024 / 1024)} MB).`,
    );
  }

  const filename = file.name || "source";

  if (TEXT_EXTENSIONS.test(filename) || file.type.startsWith("text/")) {
    const text = await file.text();
    return { text: collapseWhitespace(text), filename };
  }

  if (PDF_EXTENSION.test(filename) || file.type === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    return { text: collapseWhitespace(text), filename };
  }

  throw new Error(`Unsupported source file. Use ${SUPPORTED_SOURCE_DESCRIPTION}.`);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function collapseWhitespace(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

/**
 * Trim source text to roughly fit into a generation context. Keeps the start
 * of the document where summaries and chapter headings usually live.
 */
export function truncateSourceText(text: string, maxChars = 80_000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[...truncated for length...]`;
}
