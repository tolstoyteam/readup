/** Keep Gutenberg metadata authoritative even if generation returns another title. */
export function generatedEditionTitle(generatedTitle: string, sourceTitle?: string): string {
  return sourceTitle?.trim() || generatedTitle;
}
