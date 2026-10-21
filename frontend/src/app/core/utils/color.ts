type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

export function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

export function mix(hex: string, withHex: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(withHex);
  return rgbToHex(a.map((c, i) => c + (b[i] - c) * amount) as Rgb);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function readableAccent(color: string, backgrounds: string[], toward: string, target = 4.5): string {
  for (let amount = 0; amount <= 0.95; amount += 0.05) {
    const candidate = mix(color, toward, amount);
    if (backgrounds.every((bg) => contrastRatio(candidate, bg) >= target)) return candidate;
  }
  return toward;
}

export function readableTextOn(...backgrounds: string[]): string {
  const candidates = ['#ffffff', '#1c1917'];
  const worst = (text: string) => Math.min(...backgrounds.map((bg) => contrastRatio(text, bg)));
  return worst(candidates[0]) >= worst(candidates[1]) ? candidates[0] : candidates[1];
}

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

function saturation([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.sqrt(a.reduce((sum, c, i) => sum + (c - b[i]) ** 2, 0));
}

export async function extractPalette(src: string, count = 3): Promise<string[]> {
  const image = new Image();
  image.src = src;
  await image.decode();

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;

  const buckets = new Map<string, { rgb: Rgb; count: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const light = (Math.max(...rgb) + Math.min(...rgb)) / 2;
    if (light > 240 || light < 18 || saturation(rgb) < 0.18) continue;

    const key = rgb.map((c) => c >> 4).join('-');
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.rgb = bucket.rgb.map((c, j) => c + (rgb[j] - c) / (bucket.count + 1)) as Rgb;
      bucket.count++;
    } else {
      buckets.set(key, { rgb, count: 1 });
    }
  }

  const picked: Rgb[] = [];
  for (const { rgb } of [...buckets.values()].sort((a, b) => b.count - a.count)) {
    if (picked.every((p) => distance(p, rgb) > 70)) picked.push(rgb);
    if (picked.length === count) break;
  }

  return picked.map(rgbToHex);
}
