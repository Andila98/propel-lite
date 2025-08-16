
// lib/storage/s3.ts
import { IStorage, buildObjectKey, UploadTarget } from './index';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // important for many S3-compatible providers
});

const BUCKET = process.env.S3_BUCKET!;

export class S3Storage implements IStorage {
  async upload({ file, mimeType, originalName, target }: {
    file: Buffer; mimeType: string; originalName: string; target: UploadTarget;
  }) {
    const key = buildObjectKey(target, sanitize(originalName));
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: 'public-read', // for public buckets; remove if using signed URLs
    }));
    return { key, publicUrl: this.getPublicUrl(key) };
  }

  async deleteByKey(key: string) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }

  getPublicUrl(key: string) {
    // Public bucket pattern; adjust for your provider's URL scheme
    const endpoint = process.env.S3_ENDPOINT!.replace(/^https?:\/\//, '');
    return `https://${BUCKET}.${endpoint}/${key}`;
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}
