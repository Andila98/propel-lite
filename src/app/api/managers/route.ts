
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // In a real app, you would filter managers by the landlord's ID from the session.
    const managersSnapshot = await firestore.collection('managers').get();
    const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(managers);
    
  } catch (error: any) {
    console.error('[MANAGERS_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
