"use client";

import type { BookEditorValues } from "@/app/upload/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BookPreview({ value }: { value: BookEditorValues }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live preview</CardTitle>
      </CardHeader>
      <CardContent>
      <h2 className="font-reader text-2xl font-semibold">
        {value.title || "Untitled book"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {value.author || "Unknown author"} · {value.language || "No language"}
      </p>

      {value.keywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.keywords.map((keyword, index) => (
            <Badge
              key={`${keyword}-${index}`}
              variant="secondary"
            >
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-5">
        {value.chapters.map((chapter, chapterIndex) => (
          <section key={chapter.id || chapterIndex}>
            <h3 className="font-reader text-lg font-semibold">
              {chapter.title || `Chapter ${chapterIndex + 1}`}
            </h3>
            <div className="mt-2 flex flex-col gap-3 font-reader text-sm leading-6 text-muted-foreground">
              {chapter.blocks.map((block, blockIndex) =>
                block.type === "quote" ? (
                  <blockquote
                    key={block.id || blockIndex}
                    className="border-l-4 border-primary pl-4 italic text-foreground"
                  >
                    <p>{block.content.text || "Quote..."}</p>
                    {block.content.source ? (
                      <footer className="mt-1 text-xs not-italic text-muted-foreground">
                        {block.content.source}
                      </footer>
                    ) : null}
                  </blockquote>
                ) : (
                  <p key={block.id || blockIndex}>{block.content.text || "Paragraph..."}</p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
      </CardContent>
    </Card>
  );
}
