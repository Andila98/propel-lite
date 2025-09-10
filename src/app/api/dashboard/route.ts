
import { NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: any) {  // Use 'any' temporarily to bypass type issues
    try {
        console.log('[DEBUG] Dashboard API called');
        
        // Get session cookie
        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        
        if (!sessionCookie) {
            console.log('[DEBUG] No session cookie');
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        console.log('[DEBUG] Session cookie found');
        
        // Return test data for now
        const testData = {
            totalProperties: 5,
            totalTenants: 12,
            totalRevenue: 150000,
            revenueChange: 0.12,
            occupancyRate: 85,
            properties: [],
            anomalyAlerts: [],
            aiSummary: "Test data loaded successfully",
            latePaymentData: [],
            paymentMethodData: []
        };
        
        console.log('[DEBUG] Returning test data');
        return NextResponse.json(testData);
        
    } catch (error: any) {
        console.error('[ERROR] Dashboard API failed:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}
