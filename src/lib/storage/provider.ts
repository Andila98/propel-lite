
// lib/storage/provider.ts
import { IStorage } from './index';
import { SupabaseStorage } from './supabase';
import { S3Storage } from './s3';

export function getStorage(): IStorage {
  // Prefer S3 if endpoint creds exist, else fallback to Supabase
  if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    return new S3Storage();
  }
  return new SupabaseStorage();
}
