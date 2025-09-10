
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: any) {  // Use 'any' temporarily to bypass type issues
    console.log('[DEBUG] Dashboard API called');
    
    try {
        // Get the cookie using the standard Web API
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) {
                acc[key] = decodeURIComponent(value);
            }
            return acc;
        }, {});
        
        const sessionCookie = cookies['RentEaseAuth']; // Replace with your actual cookie name
        
        if (!sessionCookie) {
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        return NextResponse.json({ 
            message: 'Success',
            cookieFound: !!sessionCookie,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('[ERROR] Dashboard API crashed:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
