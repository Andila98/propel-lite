
// lib/storage/supabase.ts
import { IStorage, buildObjectKey, UploadTarget } from './index';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = process.env.SUPABASE_BUCKET_IMAGES || 'gallery';

export class SupabaseStorage implements IStorage {
  async upload({ file, mimeType, originalName, target }: {
    file: Buffer; mimeType: string; originalName: string; target: UploadTarget;
  }) {
    const key = buildObjectKey(target, sanitize(originalName));
    const { data, error } = await supabase.storage.from(BUCKET).upload(key, file, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw error;
    return { key, publicUrl: this.getPublicUrl(key) };
  }

  async deleteByKey(key: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([key]);
    if (error) throw error;
  }

  getPublicUrl(key: string) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}
