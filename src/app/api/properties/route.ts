
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: any) {
    try {
        console.log('[DEBUG] Properties API called');
        
        // Return empty array for now
        const testProperties: any[] = [];
        
        console.log('[DEBUG] Returning properties');
        return NextResponse.json({ properties: testProperties, meta: { totalProperties: 0, totalUnits: 0, occupiedUnits: 0, occupancyRate: 0 }});
        
    } catch (error: any) {
        console.error('[ERROR] Properties API failed:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}
