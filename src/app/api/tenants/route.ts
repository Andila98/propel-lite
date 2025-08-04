
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const tenantsSnapshot = await db.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(tenants);
    } catch (error: any) {
        console.error('API Error: Failed to fetch tenants:', error);
        return NextResponse.json(
            { error: `Failed to fetch tenants: ${error.message}` },
            { status: 500 }
        );
    }
}

    