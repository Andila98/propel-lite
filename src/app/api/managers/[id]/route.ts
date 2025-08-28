
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { logActivity } from '@/lib/audit-log-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const managerId = params.id;
        const managerDoc = await firestore.collection('managers').doc(managerId).get();

        if (!managerDoc.exists) {
            return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        }
        
        return NextResponse.json({ id: managerDoc.id, ...managerDoc.data() }, { status: 200 });

    } catch (error: any) {
        console.error(`[ERROR: /api/managers/{id} GET]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const managerId = params.id;
        const body = await req.json();

        // Separate permissions from other data
        const { permissions, ...managerData } = body;

        // 1. Update the manager's document in Firestore
        await firestore.collection('managers').doc(managerId).update(managerData);

        // 2. Update the user's custom claims in Firebase Auth
        const user = await auth.getUser(managerId);
        await auth.setCustomUserClaims(managerId, {
            ...user.customClaims, // preserve existing claims
            role: 'manager',
            permissions: permissions || {},
        });
        
        await logActivity('Admin', `Updated manager "${managerData.name}"`, { type: 'Manager', name: managerData.name });

        return NextResponse.json({ message: 'Manager updated successfully.' }, { status: 200 });
    } catch (error: any) {
        console.error(`[ERROR: /api/managers/{id} PUT]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const managerId = params.id;
        const managerRef = firestore.collection('managers').doc(managerId);
        const managerDoc = await managerRef.get();

        if (!managerDoc.exists) {
            return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
        }

        const managerData = managerDoc.data();
        
        await managerRef.delete();
        await auth.deleteUser(managerId);
        
        await logActivity('Admin', `Deleted manager "${managerData?.name}"`, { type: 'Manager', name: managerData?.name });

        return NextResponse.json({ message: 'Manager successfully deleted.' }, { status: 200 });
    } catch (error: any) {
      console.error(`[ERROR: /api/managers/{id} DELETE]`, error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
