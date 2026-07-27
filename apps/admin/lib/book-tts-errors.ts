export type TtsSynthesisContext = {
  bookId: number;
  language: string;
  chunkIndex?: number;
  voice?: string;
  attempt?: number;
};

export class TtsSynthesisError extends Error {
  readonly context: TtsSynthesisContext;
  readonly cause?: unknown;

  constructor(message: string, context: TtsSynthesisContext, cause?: unknown) {
    super(message);
    this.name = "TtsSynthesisError";
    this.context = context;
    this.cause = cause;
  }
}

export function logTtsError(context: TtsSynthesisContext, error: unknown): void {
  const base = {
    step: "tts_synthesize",
    bookId: context.bookId,
    language: context.language,
    chunk: context.chunkIndex,
    voice: context.voice,
    attempt: context.attempt,
  };

  if (error instanceof Error) {
    console.error("[tts_synthesize]", { ...base, message: error.message, stack: error.stack });
    return;
  }
  console.error("[tts_synthesize]", { ...base, error });
}
