
'use client';
import { useState } from 'react';
import { compressFile } from '@/lib/client/compress';
import { getIdToken } from '@/lib/client/firebaseAuth';

type Props = {
  kind: 'property' | 'profile';
  propertyId?: string;
  onUploaded?: (payload: { url: string; key: string }) => void;
};

export default function ImageUploader({ kind, propertyId, onUploaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);

    try {
      // 1) compress client-side to WebP
      const compressed = await compressFile(file);

      // 2) send to API
      const token = await getIdToken();
      const form = new FormData();
      form.append('kind', kind);
      if (kind === 'property' && propertyId) form.append('propertyId', propertyId);
      form.append('file', compressed);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      onUploaded?.(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={onChange} disabled={loading} />
      {loading && <p>Uploading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
