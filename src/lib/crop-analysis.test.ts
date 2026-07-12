import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { analyzeCropImage, prepareStorageImage } from "./crop-analysis";

async function solidColorPng(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();
}

describe("analyzeCropImage", () => {
  it("classifies a solid green image as mostly green", async () => {
    const buffer = await solidColorPng(40, 160, 40);
    const result = await analyzeCropImage(buffer);
    expect(result.greenRatio).toBeGreaterThan(0.95);
    expect(result.yellowBrownRatio).toBeLessThan(0.05);
  });

  it("classifies a solid brown image as mostly yellow/brown", async () => {
    const buffer = await solidColorPng(150, 100, 40);
    const result = await analyzeCropImage(buffer);
    expect(result.yellowBrownRatio).toBeGreaterThan(0.95);
    expect(result.greenRatio).toBeLessThan(0.05);
  });

  it("classifies a solid gray image as other and computes brightness", async () => {
    const buffer = await solidColorPng(128, 128, 128);
    const result = await analyzeCropImage(buffer);
    expect(result.otherRatio).toBeGreaterThan(0.95);
    expect(result.avgBrightness).toBeCloseTo(50, 0);
  });

  it("ratios always sum to 1", async () => {
    const buffer = await solidColorPng(60, 130, 70);
    const result = await analyzeCropImage(buffer);
    const sum = result.greenRatio + result.yellowBrownRatio + result.otherRatio;
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("prepareStorageImage", () => {
  it("re-encodes the image as jpeg and constrains width", async () => {
    const buffer = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: { r: 10, g: 200, b: 10 } },
    })
      .png()
      .toBuffer();

    const { data, mimeType } = await prepareStorageImage(buffer);
    expect(mimeType).toBe("image/jpeg");

    const meta = await sharp(data).metadata();
    expect(meta.width).toBeLessThanOrEqual(1280);
    expect(meta.format).toBe("jpeg");
  });
});
