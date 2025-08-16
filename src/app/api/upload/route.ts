
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { getStorage } from '@/lib/storage/provider';
import { z } from 'zod';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel edge hint (Node runtime)

const schema = z.object({
  kind: z.enum(['property', 'profile']),
  propertyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1) Auth: verify Firebase ID token from header
    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2) FormData parsing
    const form = await req.formData();
    const kind = form.get('kind')?.toString();
    const parsed = schema.safeParse({ kind, propertyId: form.get('propertyId')?.toString() });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    
    // Server-side compression with Sharp as a fallback
    const buffer = await sharp(Buffer.from(arrayBuffer))
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

    const storage = getStorage();

    const target = parsed.data.kind === 'property'
      ? { kind: 'property' as const, propertyId: parsed.data.propertyId!, uploaderUid: uid }
      : { kind: 'profile' as const, uid };

    // 3) Upload to storage
    const { key, publicUrl } = await storage.upload({
      file: buffer,
      mimeType: 'image/webp',
      originalName: file.name,
      target,
    });

    // 4) Firestore write (atomic semantics per type)
    if (target.kind === 'property') {
      const ref = firestore.collection('properties').doc(target.propertyId);
      await ref.update({ images: adminFieldValue('arrayUnion', { key, url: publicUrl }) });
    } else {
      const ref = firestore.collection('users').doc(uid);
      // Get current image key to delete (if any)
      const snap = await ref.get();
      const prev = snap.exists ? (snap.data()?.profileImageKey as string | undefined) : undefined;
      await ref.set({ profileImageUrl: publicUrl, profileImageKey: key }, { merge: true });
      if (prev && prev !== key) {
        // best-effort cleanup
        await storage.deleteByKey(prev).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, url: publicUrl, key });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}

// tiny helper for arrayUnion via admin SDK
function adminFieldValue(op: 'arrayUnion', value: any) {
  const admin = require('firebase-admin');
  return (admin.firestore.FieldValue as any)[op](value);
}
