
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const tenantId = params.id;
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
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
