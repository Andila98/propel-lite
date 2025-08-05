import { NextResponse } from 'next/server';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { db } from '@/lib/firebase-admin';
import type { PropertyManager, Property } from '@/lib/types';

export const GET = withRole(async (req: AuthenticatedRequest) => {
  const { uid: managerId } = req.user;

  try {
    // First, get the list of properties the manager is assigned to
    const managerDoc = await db.collection('users').doc(managerId).get();
    if (!managerDoc.exists) {
        return NextResponse.json({ error: 'Manager profile not found.' }, { status: 404 });
    }
    
    // In our app, the list of managed properties is on the manager document
    // This is a mock implementation detail; a real app might fetch this from the user's claims or another source
    const managerData = managerDoc.data() as PropertyManager; 
    const managedPropertyIds = managerData.propertiesManaged || [];

    if (managedPropertyIds.length === 0) {
        return NextResponse.json([]);
    }

    // Fetch all properties assigned to this manager.
    // Firestore's 'in' query is limited to 30 items. For more, you'd need multiple queries.
    const propertiesSnapshot = await db.collection('properties')
        .where(db.FieldPath.documentId(), 'in', managedPropertyIds)
        .get();

    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Property }));
    
    return NextResponse.json(properties);

  } catch (error: any) {
    console.error(`[MANAGER_PROPERTIES_ERROR] for manager ${managerId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

}, ['manager']);
