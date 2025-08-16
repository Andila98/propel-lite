
// lib/client/compress.ts
import imageCompression from 'browser-image-compression';

export async function compressFile(input: File) {
  const maxMB = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_MB || 5);
  const compressed = await imageCompression(input, {
    maxSizeMB: maxMB,
    maxWidthOrHeight: 1920,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: 'image/webp',
  });
  return new File([await compressed.arrayBuffer()], renameToWebp(input.name), { type: 'image/webp' });
}

function renameToWebp(name: string) {
  return name.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '') + '.webp';
}
