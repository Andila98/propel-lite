
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';
import { getLandlordAndActor } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`[DEBUG][${requestId}] Dashboard API called`);
        
        // Extract session cookie first
        const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
        
        if (!sessionCookie) {
            console.warn(`[WARN][${requestId}] No session cookie found`);
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log(`[DEBUG][${requestId}] Authenticating with session cookie`);
        
        // Pass session cookie string, not NextRequest object
        const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId) {
            console.warn(`[WARN][${requestId}] Auth failed:`, authError?.message);
            return NextResponse.json({ 
                error: authError?.message || 'Unauthorized access' 
            }, { status: authError?.statusCode || 401 });
        }

        console.log(`[INFO][${requestId}] Auth successful for landlord: ${landlordId}`);
        
        // Return minimal test data for now
        const testData = {
            totalProperties: 0,
            totalTenants: 0,
            totalRevenue: 0,
            revenueChange: 0.12,
            occupancyRate: 0,
            properties: [],
            anomalyAlerts: [],
            aiSummary: "Dashboard data loaded successfully",
            latePaymentData: [],
            paymentMethodData: []
        };
        
        return NextResponse.json(testData);
        
    } catch (error: any) {
        console.error(`[ERROR][${requestId}] Dashboard API failed:`, {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        return NextResponse.json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
