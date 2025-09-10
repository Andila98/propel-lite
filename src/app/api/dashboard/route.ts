
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    console.log('[DEBUG] Dashboard API called');
    
    try {
        // Test 1: Basic response
        console.log('[DEBUG] Testing basic response');
        
        // Test 2: Check session cookie
        console.log('[DEBUG] Checking session cookie');
        const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
        console.log('[DEBUG] Session cookie exists:', !!sessionCookie);
        
        if (!sessionCookie) {
            console.log('[DEBUG] No session cookie, returning 401');
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        // Test 3: Try importing auth utils
        console.log('[DEBUG] Importing auth utils');
        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        console.log('[DEBUG] Auth utils imported successfully');
        
        // Test 4: Try authentication
        console.log('[DEBUG] Testing authentication');
        const authResult = await getLandlordAndActor(sessionCookie);
        console.log('[DEBUG] Auth result:', { 
            hasLandlordId: !!authResult.landlordId,
            hasActor: !!authResult.actor,
            hasError: !!authResult.error,
            errorMessage: authResult.error?.message 
        });
        
        if (authResult.error || !authResult.landlordId) {
            console.log('[DEBUG] Auth failed, returning 401');
            return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
        }
        
        // --- NEW TESTS ---
        console.log('[DEBUG] Testing Firestore import');
        const { firestore, isFirebaseAdminInitialized } = await import('@/lib/firebase-admin');
        console.log('[DEBUG] Firebase initialized:', isFirebaseAdminInitialized);

        console.log('[DEBUG] Testing date-fns import');
        const { sub, startOfDay } = await import('date-fns');

        console.log('[DEBUG] Testing utils import');  
        const { toJSON } = await import('@/lib/utils');

        console.log('[DEBUG] All new tests passed. Returning success response');
        return NextResponse.json({ 
            message: 'Debug successful',
        });

    } catch (error: any) {
        console.error('[DEBUG] Test API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
