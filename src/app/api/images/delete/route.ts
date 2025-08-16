
// app/api/images/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { getStorage } from '@/lib/storage/provider';
import { z } from 'zod';

const schema = z.object({
  kind: z.enum(['property', 'profile']),
  key: z.string(),
  propertyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await req.json();
    const parsed = schema.parse(body);

    const storage = getStorage();

    if (parsed.kind === 'property') {
      // Authorization: ensure requester can modify this property (RBAC/ownership check — implement as needed)
      const ref = firestore.collection('properties').doc(parsed.propertyId!);
      await ref.update({ images: adminFieldValue('arrayRemove', { key: parsed.key, url: storage.getPublicUrl(parsed.key) }) });
      await storage.deleteByKey(parsed.key);
    } else {
      // only allow self profile changes
      const userRef = firestore.collection('users').doc(uid);
      const snap = await userRef.get();
      const currentKey = snap.data()?.profileImageKey as string | undefined;
      if (currentKey && currentKey === parsed.key) {
        await storage.deleteByKey(parsed.key);
        await userRef.set({ profileImageUrl: null, profileImageKey: null }, { merge: true });
      } else {
        return NextResponse.json({ error: 'Not allowed or key mismatch' }, { status: 403 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}

function adminFieldValue(op: 'arrayRemove', value: any) {
  const admin = require('firebase-admin');
  return (admin.firestore.FieldValue as any)[op](value);
}
