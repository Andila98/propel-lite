
// lib/storage/index.ts
export type UploadTarget =
  | { kind: 'property'; propertyId: string; uploaderUid: string }
  | { kind: 'profile'; uid: string };

export interface IStorage {
  upload(opts: {
    file: Buffer;
    mimeType: string;
    originalName: string;
    target: UploadTarget;
  }): Promise<{ key: string; publicUrl: string }>;

  deleteByKey(key: string): Promise<void>;

  getPublicUrl(key: string): string; // pure function for deterministic URLs

  getSignedUrl?(key: string): Promise<{ signedUrl: string, error: string | null }>;
}

export function buildObjectKey(target: UploadTarget, fileName: string) {
  const ts = Date.now();
  if (target.kind === 'property') {
    return `properties/${target.propertyId}/${target.uploaderUid}/${ts}-${fileName}`;
  }
  return `profiles/${target.uid}/${ts}-${fileName}`;
}
