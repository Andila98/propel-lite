
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

// GET a specific manager
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const managerId = params.id;
    const managerDoc = await firestore.collection('managers').doc(managerId).get();

    if (!managerDoc.exists) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }
    
    return NextResponse.json({ id: managerDoc.id, ...managerDoc.data() });
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch manager ${params.id}:`, error);
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
  try {
    const managerId = params.id;
    const updates = await req.json();

    // TODO: Add Zod validation for the update payload

    await firestore.collection('managers').doc(managerId).update(updates);
    
    return NextResponse.json({ message: 'Manager updated successfully' });
    
  } catch (error: any) {
    console.error(`[MANAGER_UPDATE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}


// DELETE a manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const managerId = params.id;
    
    // Deleting the Firestore document. The Auth user must be deleted separately if needed.
    await firestore.collection('managers').doc(managerId).delete();
    
    return NextResponse.json({ message: 'Manager deleted successfully' });
  } catch (error: any) {
    console.error(`[MANAGER_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
