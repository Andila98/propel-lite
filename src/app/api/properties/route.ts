
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const propertiesSnapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
        const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(properties);
    } catch (error: any) {
        console.error('API Error: Failed to fetch properties:', error);
        return NextResponse.json(
            { error: `Failed to fetch properties: ${error.message}` },
            { status: 500 }
        );
    }
}
