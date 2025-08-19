
// lib/client/compress.ts
import imageCompression from 'browser-image-compression';

export async function compressFile(input: File): Promise<File> {
  const options = {
    maxSizeMB: 1,          // Max file size in MB
    maxWidthOrHeight: 1920, // Max width or height
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(input, options);
    console.log(`Compressed file size: ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original file if compression fails
    return input;
  }
}
