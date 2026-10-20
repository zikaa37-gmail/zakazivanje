export interface ResizedImage {
  data: string;
  width: number;
  height: number;
}

export async function resizeImage(file: File, maxSide = 1600): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const png = file.type === 'image/png' || file.type === 'image/gif';
  return { data: canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85), width: canvas.width, height: canvas.height };
}
