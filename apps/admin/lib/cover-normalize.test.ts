import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { validateCoverBytes } from "./cover-image";
import {
  COVER_TARGET_HEIGHT,
  COVER_TARGET_WIDTH,
  normalizeCoverImage,
} from "./cover-normalize";

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 80, b: 120 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("normalizeCoverImage", () => {
  it("resizes and crops to 1000×1600 PNG with valid cover aspect", async () => {
    const input = await makeJpeg(1024, 1536);
    const cover = await normalizeCoverImage(input);

    assert.equal(cover.mime, "image/png");
    assert.equal(cover.extension, "png");

    const meta = await sharp(cover.buffer).metadata();
    assert.equal(meta.width, COVER_TARGET_WIDTH);
    assert.equal(meta.height, COVER_TARGET_HEIGHT);

    const validated = validateCoverBytes(cover.buffer, "image/png");
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.equal(validated.width, COVER_TARGET_WIDTH);
      assert.equal(validated.height, COVER_TARGET_HEIGHT);
    }
  });

  it("accepts landscape sources by center-cover cropping", async () => {
    const input = await makeJpeg(1600, 900);
    const cover = await normalizeCoverImage(input);
    const meta = await sharp(cover.buffer).metadata();
    assert.equal(meta.width, COVER_TARGET_WIDTH);
    assert.equal(meta.height, COVER_TARGET_HEIGHT);
  });

  it("rejects empty buffers", async () => {
    await assert.rejects(() => normalizeCoverImage(Buffer.alloc(0)), /empty/i);
  });
});
