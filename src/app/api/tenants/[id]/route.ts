
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenantDoc = await db.collection('users').doc(tenantId).get();

    if (!tenantDoc.exists || tenantDoc.data()?.role !== 'tenant') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = { id: tenantDoc.id, ...tenantDoc.data() };
    return NextResponse.json(tenant);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch tenant: ${error.message}` },
      { status: 500 }
    );
  }
}
