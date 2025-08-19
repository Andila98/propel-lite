
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const tenantId = params.id;
        // The tenant document ID should be the same as the Firebase Auth UID
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            // It's possible the tenant was created in Auth but the Firestore doc failed.
            // Let's try to find them by email as a fallback.
            const tenantByEmail = await firestore.collection('tenants').where('uid', '==', tenantId).limit(1).get();
            if(tenantByEmail.empty) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            const doc = tenantByEmail.docs[0];
            return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 200 });
        }
        
        return NextResponse.json({ id: tenantDoc.id, ...tenantDoc.data() }, { status: 200 });

    } catch (error: any) {
        console.error(`[API_TENANT_GET_ERROR] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await firestore.collection('tenants').doc(params.id).delete();
        return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });
    } catch (error: any) {
      console.error(`[API_TENANT_DELETE_ERROR] Failed to delete tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

    