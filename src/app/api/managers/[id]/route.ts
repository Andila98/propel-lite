
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { logActivity } from '@/lib/audit-log-service';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const {landlordId, error: authError} = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const managerId = params.id;
        const managerDoc = await firestore.collection('managers').doc(managerId).get();

        if (!managerDoc.exists || managerDoc.data()?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        }
        
        return NextResponse.json(toJSON({ id: managerDoc.id, ...managerDoc.data() }), { status: 200 });

    } catch (error: unknown) {
        console.error(`[ERROR: /api/managers/{id} GET]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const {landlordId, actor, error: authError} = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId || !actor) {
        return NextResponse.json({ error: 'Unauthorized: Only landlords can edit managers.' }, { status: 401 });
    }

    try {
        const managerId = params.id;
        const body = await req.json();

        // Update the manager's document in Firestore. It is the source of truth.
        await firestore.collection('managers').doc(managerId).update(body);
        
        // Also update the custom claims to keep them in sync for faster checks.
        // This ensures the session token reflects the new permissions upon refresh.
        const managerUser = await auth.getUser(managerId);
        await auth.setCustomUserClaims(managerId, {
            ...managerUser.customClaims, // Preserve existing claims like role, landlordId
            permissions: body.permissions,
        });

        await logActivity(actor.displayName || 'Admin', `Updated manager "${body.name}"`, { type: 'Manager', name: body.name }, landlordId);

        return NextResponse.json({ message: 'Manager updated successfully.' }, { status: 200 });
    } catch (error: unknown) {
        console.error(`[ERROR: /api/managers/{id} PUT]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const {landlordId, actor, error: authError} = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId || !actor) {
        return NextResponse.json({ error: 'Unauthorized: Only landlords can delete managers.' }, { status: 401 });
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
        
        await logActivity(actor.displayName || 'Admin', `Deleted manager "${managerData?.name}"`, { type: 'Manager', name: managerData?.name }, landlordId);

        return NextResponse.json({ message: 'Manager successfully deleted.' }, { status: 200 });
    } catch (error: unknown) {
      console.error(`[ERROR: /api/managers/{id} DELETE]`, error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
