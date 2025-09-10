
import { NextResponse, type NextRequest } from 'next/server';

// Test imports one by one
console.log('Testing basic imports...');

try {
    console.log('Importing firestore...');
    const { firestore, isFirebaseAdminInitialized } = await import('@/lib/firebase-admin');
    console.log('Firestore imported successfully');
    
    console.log('Importing date-fns...');
    const { sub, format, startOfDay } = await import('date-fns');
    console.log('date-fns imported successfully');
    
    console.log('Importing utils...');
    const { toJSON } = await import('@/lib/utils');
    console.log('Utils imported successfully');
    
    console.log('Importing auth-utils...');
    const { getLandlordAndActor } = await import('@/lib/auth-utils');
    console.log('Auth utils imported successfully');
    
    console.log('Importing types...');
    const types = await import('@/lib/types');
    console.log('Types imported successfully');
    
} catch (error) {
    console.error('Import error:', error);
}

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        console.log('Test dashboard API called');
        return NextResponse.json({ message: 'Test successful' });
    } catch (error: any) {
        console.error('Test API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
