
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { PropertyManager, Property } from 'src/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  try {
    const { decodedToken, error } = await verifyApiAuth(req, ['manager']);
    if (error) return error;

    const managerId = decodedToken.uid;

    const managerDoc = await db.collection('users').doc(managerId).get();
    if (!managerDoc.exists) {
        return NextResponse.json({ error: 'Manager profile not found.' }, { status: 404 });
    }
    
    const managerData = managerDoc.data() as PropertyManager; 
    const managedPropertyIds = managerData.propertiesManaged || [];

    if (managedPropertyIds.length === 0) {
        return NextResponse.json([]);
    }

    const propertiesSnapshot = await db.collection('properties')
        .where(db.FieldPath.documentId(), 'in', managedPropertyIds)
        .get();

    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Property }));
    
    return NextResponse.json(properties);

  } catch (error: any) {
    console.error(`[MANAGER_PROPERTIES_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
