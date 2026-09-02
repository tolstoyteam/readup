"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type BookCoverThumbnailProps = {
  src: string | null;
};

export function BookCoverThumbnail({ src }: BookCoverThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "aspect-[5/8] w-12 shrink-0 overflow-hidden rounded-sm",
        !showImage && "bg-muted/40",
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
