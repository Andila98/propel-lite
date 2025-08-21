
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { logActivity } from '@/lib/audit-log-service';

// GET a specific manager
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminInitialized) {
      console.error(`[API_MANAGER_ID] Firebase Admin is not initialized.`);
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

  try {
    const managerId = params.id;
    const managerDoc = await firestore.collection('managers').doc(managerId).get();

    if (!managerDoc.exists) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }
    
    return NextResponse.json({ id: managerDoc.id, ...managerDoc.data() });
    
  } catch (error: any) {
    console.error(`[API_MANAGER_ID_GET_ERROR] Failed to fetch manager ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch manager: ${error.message}` },
      { status: 500 }
    );
  }
}

// UPDATE a manager's details
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminInitialized) {
      console.error(`[API_MANAGER_ID] Firebase Admin is not initialized.`);
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

  try {
    const managerId = params.id;
    const updates = await req.json();

    // TODO: Add Zod validation for the update payload

    await firestore.collection('managers').doc(managerId).update(updates);
    
    // TODO: Get actor name from session
    await logActivity('Admin', `Updated manager profile for "${updates.name}"`, { type: 'Manager', name: updates.name });
    
    return NextResponse.json({ message: 'Manager updated successfully' });
    
  } catch (error: any) {
    console.error(`[API_MANAGER_ID_UPDATE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}


// DELETE a manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminInitialized) {
      console.error(`[API_MANAGER_ID] Firebase Admin is not initialized.`);
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

  try {
    const managerId = params.id;
    const managerRef = firestore.collection('managers').doc(managerId);
    const managerDoc = await managerRef.get();

    if (!managerDoc.exists) {
        return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
    }
    const managerData = managerDoc.data();
    
    // The manager's document ID is their Firebase Auth UID.
    // First, delete the Firestore document.
    await managerRef.delete();
    
    // Then, delete the user from Firebase Authentication.
    await auth.deleteUser(managerId);

    // TODO: Get actor name from session
    await logActivity('Admin', `Deleted manager "${managerData?.name}"`, { type: 'Manager', name: managerData?.name || managerId });
    
    return NextResponse.json({ message: 'Manager deleted successfully' });
  } catch (error: any) {
    console.error(`[API_MANAGER_ID_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
