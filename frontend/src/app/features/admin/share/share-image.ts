export type ImageFormat = 'portrait' | 'square' | 'story';

export const IMAGE_SIZES: Record<ImageFormat, { width: number; height: number; label: string }> = {
  portrait: { width: 1080, height: 1350, label: 'Objava 4:5' },
  square: { width: 1080, height: 1080, label: 'Kvadrat' },
  story: { width: 1080, height: 1920, label: 'Story' },
};

const PLATE = '#ffffff';
const PHOTO_TEXT = '#ffffff';
const SHADE = ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.75)'];

export interface Brand {
  name: string;
  handle: string;
  primary: string;
  dark: string;
  onPrimary: string;
  font: string;
  logo: HTMLImageElement | null;
}

export interface PriceRow {
  name: string;
  price: string;
}

export type ShareTemplate =
  | { kind: 'book'; qr: HTMLImageElement | null; host: string }
  | { kind: 'promotion'; title: string; value: string; scope: string; period: string; code: string | null }
  | { kind: 'prices'; title: string; rows: PriceRow[] }
  | { kind: 'photo'; photo: HTMLImageElement | null; caption: string };

export function drawShareImage(canvas: HTMLCanvasElement, format: ImageFormat, brand: Brand, template: ShareTemplate): void {
  const { width, height } = IMAGE_SIZES[format];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const story = format === 'story';
  const safeTop = story ? 250 : 80;
  const safeBottom = height - (story ? 280 : 80);

  if (template.kind === 'photo') {
    drawPhoto(ctx, width, height, brand, template, safeBottom);
    return;
  }

  background(ctx, width, height, brand);
  let y = header(ctx, width, safeTop, brand);
  ctx.textAlign = 'center';
  ctx.fillStyle = brand.onPrimary;

  if (template.kind === 'book') {
    const middle = (y + safeBottom) / 2;
    ctx.font = `800 84px ${brand.font}`;
    const lines = wrap(ctx, 'Zakaži termin online', width - 160);
    const qrSize = Math.min(380, safeBottom - y - lines.length * 96 - 220);
    let top = middle - (lines.length * 96 + 60 + qrSize + 90) / 2;
    lines.forEach((line) => {
      ctx.fillText(line, width / 2, (top += 96) - 20);
    });
    top += 40;
    if (template.qr && qrSize > 120) {
      const pad = 28;
      roundRect(ctx, (width - qrSize) / 2 - pad, top - pad + 20, qrSize + pad * 2, qrSize + pad * 2, 28);
      ctx.fillStyle = PLATE;
      ctx.fill();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(template.qr, (width - qrSize) / 2, top + 20, qrSize, qrSize);
      ctx.imageSmoothingEnabled = true;
      top += qrSize + pad * 2 + 30;
    }
    ctx.fillStyle = brand.onPrimary;
    ctx.font = `600 44px ${brand.font}`;
    fit(ctx, template.host, width / 2, top + 40, width - 160);
  }

  if (template.kind === 'promotion') {
    ctx.font = `800 76px ${brand.font}`;
    const titleLines = wrap(ctx, template.title, width - 160).slice(0, 3);
    ctx.font = `500 40px ${brand.font}`;
    const scopeLines = wrap(ctx, template.scope, width - 200).slice(0, 3);
    const big = template.value.length > 14 ? 92 : 150;
    const blockHeight = 50 + titleLines.length * 92 + big + 80 + scopeLines.length * 52 + (template.period ? 90 : 0) + (template.code ? 130 : 0);
    let top = Math.max(y + 60, (y + safeBottom) / 2 - blockHeight / 2);
    ctx.font = `700 40px ${brand.font}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText('AKCIJA', width / 2, (top += 40));
    ctx.globalAlpha = 1;
    ctx.font = `800 76px ${brand.font}`;
    for (const line of titleLines) ctx.fillText(line, width / 2, (top += 92));
    ctx.font = `900 ${big}px ${brand.font}`;
    fit(ctx, template.value, width / 2, (top += big + 30), width - 120);
    ctx.font = `500 40px ${brand.font}`;
    top += 40;
    for (const line of scopeLines) ctx.fillText(line, width / 2, (top += 52));
    if (template.period) {
      ctx.font = `700 42px ${brand.font}`;
      ctx.fillText(template.period, width / 2, (top += 90));
    }
    if (template.code) {
      ctx.font = `600 36px ${brand.font}`;
      ctx.globalAlpha = 0.85;
      ctx.fillText('uz kod pri zakazivanju', width / 2, (top += 70));
      ctx.globalAlpha = 1;
      ctx.font = `900 64px ${brand.font}`;
      fit(ctx, template.code, width / 2, (top += 70), width - 160);
    }
  }

  if (template.kind === 'prices') {
    const rows = template.rows.slice(0, story ? 12 : format === 'portrait' ? 9 : 7);
    const rowHeight = Math.min(90, (safeBottom - y - 260) / Math.max(rows.length, 1));
    const blockHeight = 110 + rows.length * rowHeight;
    let top = Math.max(y + 60, (y + safeBottom) / 2 - blockHeight / 2);
    ctx.font = `800 64px ${brand.font}`;
    fit(ctx, template.title, width / 2, (top += 64), width - 160);
    top += 30;
    rows.forEach((row) => {
      top += rowHeight;
      ctx.font = `600 ${Math.min(44, rowHeight * 0.5)}px ${brand.font}`;
      ctx.textAlign = 'left';
      const priceWidth = ctx.measureText(row.price).width;
      fit(ctx, row.name, 110, top, width - 260 - priceWidth);
      ctx.textAlign = 'right';
      ctx.font = `800 ${Math.min(44, rowHeight * 0.5)}px ${brand.font}`;
      ctx.fillText(row.price, width - 110, top);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(110, top + rowHeight * 0.32, width - 220, 2);
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'center';
  }

  footer(ctx, width, safeBottom, brand);
}

function drawPhoto(ctx: CanvasRenderingContext2D, width: number, height: number, brand: Brand, template: Extract<ShareTemplate, { kind: 'photo' }>, safeBottom: number): void {
  ctx.fillStyle = brand.dark;
  ctx.fillRect(0, 0, width, height);
  if (template.photo) {
    const scale = Math.max(width / template.photo.naturalWidth, height / template.photo.naturalHeight);
    const w = template.photo.naturalWidth * scale;
    const h = template.photo.naturalHeight * scale;
    ctx.drawImage(template.photo, (width - w) / 2, (height - h) / 2, w, h);
  }
  const bandHeight = template.caption ? 250 : 170;
  const bandTop = safeBottom - bandHeight + 40;
  const gradient = ctx.createLinearGradient(0, bandTop - 220, 0, height);
  gradient.addColorStop(0, SHADE[0]);
  gradient.addColorStop(0.45, SHADE[1]);
  gradient.addColorStop(1, SHADE[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandTop - 220, width, height - bandTop + 220);

  let x = 80;
  if (brand.logo) {
    const size = 110;
    roundRect(ctx, x, bandTop + 10, size, size, 24);
    ctx.fillStyle = PLATE;
    ctx.fill();
    drawContained(ctx, brand.logo, x + 10, bandTop + 20, size - 20, size - 20);
    x += size + 30;
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = PHOTO_TEXT;
  ctx.font = `800 52px ${brand.font}`;
  fit(ctx, brand.name, x, bandTop + 60, width - x - 80);
  ctx.font = `500 36px ${brand.font}`;
  ctx.globalAlpha = 0.9;
  fit(ctx, brand.handle, x, bandTop + 112, width - x - 80);
  ctx.globalAlpha = 1;
  if (template.caption) {
    ctx.font = `600 42px ${brand.font}`;
    fit(ctx, template.caption, 80, bandTop + 200, width - 160);
  }
}

function background(ctx: CanvasRenderingContext2D, width: number, height: number, brand: Brand): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, brand.primary);
  gradient.addColorStop(1, brand.dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = brand.onPrimary;
  ctx.beginPath();
  ctx.arc(width * 0.92, height * 0.08, width * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.05, height * 0.95, width * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function header(ctx: CanvasRenderingContext2D, width: number, top: number, brand: Brand): number {
  ctx.textAlign = 'center';
  let y = top;
  if (brand.logo) {
    const size = 150;
    roundRect(ctx, (width - size) / 2, y, size, size, 32);
    ctx.fillStyle = PLATE;
    ctx.fill();
    drawContained(ctx, brand.logo, (width - size) / 2 + 14, y + 14, size - 28, size - 28);
    y += size + 70;
  } else {
    y += 40;
  }
  ctx.fillStyle = brand.onPrimary;
  ctx.font = `700 46px ${brand.font}`;
  fit(ctx, brand.name, width / 2, y, width - 160);
  return y;
}

function footer(ctx: CanvasRenderingContext2D, width: number, bottom: number, brand: Brand): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = brand.onPrimary;
  ctx.globalAlpha = 0.9;
  ctx.font = `600 36px ${brand.font}`;
  fit(ctx, brand.handle, width / 2, bottom, width - 160);
  ctx.globalAlpha = 1;
}

function drawContained(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
  const match = ctx.font.match(/^(\d+)\s+(\d+(?:\.\d+)?)px\s+(.*)$/);
  if (match) {
    let size = parseFloat(match[2]);
    while (ctx.measureText(text).width > maxWidth && size > 18) {
      size -= 2;
      ctx.font = `${match[1]} ${size}px ${match[3]}`;
    }
  }
  ctx.fillText(text, x, y);
}
