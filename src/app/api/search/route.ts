
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordId } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import { toJSON } from '@/lib/utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const searchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(50, 'Query is too long'),
});

async function searchCollection(
  collectionName: string,
  searchField: string,
  query: string,
  landlordId: string
) {
  if (!query) return [];

  const lowerCaseQuery = query.toLowerCase();
  
  const snapshot = await firestore
    .collection(collectionName)
    .where('landlordId', '==', landlordId)
    .get();

  const results = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(doc => {
      const fieldValue = doc[searchField] as string;
      return fieldValue && fieldValue.toLowerCase().includes(lowerCaseQuery);
    });

  return toJSON(results);
}


export async function GET(request: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured' }, { status: 503 });
    }

    const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
    const landlordId = await getLandlordId(sessionCookie);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const validation = searchSchema.safeParse({ query: searchParams.get('q') });

    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid search query.', details: validation.error.flatten() }, { status: 400 });
    }
    const { query } = validation.data;

    try {
        const [properties, tenants] = await Promise.all([
            searchCollection('properties', 'address', query, landlordId),
            searchCollection('tenants', 'name', query, landlordId),
        ]);

        return NextResponse.json({ properties, tenants });

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error('[ERROR: /api/search]', { message: typedError.message, stack: typedError.stack });
        return NextResponse.json({ error: 'Internal server error during search.' }, { status: 500 });
    }
}
