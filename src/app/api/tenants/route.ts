import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';
import type { Tenant } from '@/lib/types';
import type { DocumentData } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`[DEBUG][${requestId}] Tenants API called`);
        
        if (!isFirebaseAdminInitialized) {
            console.error(`[ERROR][${requestId}] Firebase Admin not initialized`);
            return NextResponse.json({ 
                error: 'Backend services are not configured. Please contact support.' 
            }, { status: 500 });
        }

        // Get session cookie and authenticate
        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        
        if (!sessionCookie) {
            console.warn(`[WARN][${requestId}] No session cookie found`);
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log(`[DEBUG][${requestId}] Authenticating user`);
        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId || !actor) {
            console.warn(`[WARN][${requestId}] Auth failed:`, authError?.message);
            return NextResponse.json({ 
                error: authError?.message || 'Unauthorized' 
            }, { status: authError?.statusCode || 401 });
        }

        // Permission check for managers
        const role = actor.customClaims?.role;
        if (role === 'manager' && !actor.customClaims?.permissions?.canViewTenants) {
            console.warn(`[WARN][${requestId}] Manager lacks permission to view tenants`);
            return NextResponse.json({ 
                error: "You don't have permission to view tenants." 
            }, { status: 403 });
        }

        console.log(`[INFO][${requestId}] Fetching tenants for landlord: ${landlordId}`);

        // Query tenants - remove orderBy to avoid index requirement
        const tenantsSnapshot = await firestore.collection('tenants')
            .where('landlordId', '==', landlordId)
            .get();

        console.log(`[INFO][${requestId}] Found ${tenantsSnapshot.docs.length} tenants`);

        // Process tenants and sort by creation date (client-side)
        const tenants = tenantsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: DocumentData, b: DocumentData) => {
                // Sort by createdAt in descending order (newest first)
                const aTime = a.createdAt?.toDate?.().getTime() || 0;
                const bTime = b.createdAt?.toDate?.().getTime() || 0;
                return bTime - aTime;
            });

        // Calculate some useful metadata
        const activeTenantsCount = tenants.filter(t => 
            t.rentStatus === 'Paid' || t.rentStatus === 'Advance'
        ).length;
        
        const overdueTenantsCount = tenants.filter(t => 
            t.rentStatus === 'Overdue'
        ).length;

        console.log(`[INFO][${requestId}] Returning ${tenants.length} tenants with metadata`);

        const response = {
            tenants: toJSON(tenants),
            meta: {
                totalTenants: tenants.length,
                activeTenants: activeTenantsCount,
                overdueTenants: overdueTenantsCount,
                occupancyRate: tenants.length > 0 ? (activeTenantsCount / tenants.length) * 100 : 0
            }
        };

        return NextResponse.json(response);

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR][${requestId}] Tenants API failed:`, {
            name: typedError.name,
            message: typedError.message,
            stack: process.env.NODE_ENV === 'development' ? typedError.stack : undefined
        });
        
        return NextResponse.json({ 
            error: 'Failed to fetch tenants. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? typedError.message : undefined
        }, { status: 500 });
    }
}
