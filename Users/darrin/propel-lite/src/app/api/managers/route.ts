
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
      console.error('[API_MANAGERS] Firebase Admin is not initialized.');
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }
  try {
    // In a real app, you would filter managers by the landlord's ID from the session.
    const managersSnapshot = await firestore.collection('managers').get();
    const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(managers);
    
  } catch (error: any) {
    console.error('[API_MANAGERS_ERROR] Failed to list managers:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
