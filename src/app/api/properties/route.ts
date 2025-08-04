
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
    try {
        console.log("API: Fetching all properties from Firestore.");
        const propertiesSnapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
        const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`API: Successfully fetched ${properties.length} properties.`);
        return NextResponse.json(properties);
    } catch (error: any) {
        console.error('API Error: Failed to fetch properties:', error);
        return NextResponse.json(
            { error: `Failed to fetch properties: ${error.message}` },
            { status: 500 }
        );
    }
}
