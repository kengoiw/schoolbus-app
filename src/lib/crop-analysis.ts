import sharp from "sharp";

export interface CropAnalysisResult {
  greenRatio: number;
  yellowBrownRatio: number;
  otherRatio: number;
  avgBrightness: number;
}

const SAMPLE_SIZE = 96;
const GREEN_HUE_MIN = 65;
const GREEN_HUE_MAX = 170;
const YELLOW_BROWN_HUE_MIN = 25;
const YELLOW_BROWN_HUE_MAX = 65;
const MIN_SATURATION = 0.15;
const MIN_VALUE = 0.12;

/**
 * 画像をダウンサンプルしHSVベースで緑被率・黄褐色率・明るさを算出する。
 * 彩度/明度が低い画素（空・影・白飛びなど）は「その他」に分類する。
 */
export async function analyzeCropImage(buffer: Buffer): Promise<CropAnalysisResult> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixelCount = data.length / channels;

  let greenCount = 0;
  let yellowBrownCount = 0;
  let otherCount = 0;
  let brightnessSum = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const value = max / 255;
    const saturation = max === 0 ? 0 : delta / max;

    let hue = 0;
    if (delta !== 0) {
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
      if (hue < 0) hue += 360;
    }

    brightnessSum += value * 100;

    if (saturation < MIN_SATURATION || value < MIN_VALUE) {
      otherCount++;
    } else if (hue >= GREEN_HUE_MIN && hue <= GREEN_HUE_MAX) {
      greenCount++;
    } else if (hue >= YELLOW_BROWN_HUE_MIN && hue < YELLOW_BROWN_HUE_MAX) {
      yellowBrownCount++;
    } else {
      otherCount++;
    }
  }

  return {
    greenRatio: round(greenCount / pixelCount),
    yellowBrownRatio: round(yellowBrownCount / pixelCount),
    otherRatio: round(otherCount / pixelCount),
    avgBrightness: round(brightnessSum / pixelCount),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const STORAGE_MAX_WIDTH = 1280;
const STORAGE_JPEG_QUALITY = 78;

/**
 * 保存用に画像を縮小・JPEG圧縮する（DB保存サイズを抑えるため）
 */
export async function prepareStorageImage(
  buffer: Buffer
): Promise<{ data: Buffer; mimeType: string }> {
  const data = await sharp(buffer)
    .rotate()
    .resize({ width: STORAGE_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: STORAGE_JPEG_QUALITY })
    .toBuffer();

  return { data, mimeType: "image/jpeg" };
}
