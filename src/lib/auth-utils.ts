
import { cookies } from "next/headers";
import { auth as adminAuth } from "@/lib/firebase-admin";
import { authConfig } from "@/config/server-config";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

export async function getAuthToken() {
  const cookieStore = cookies();
  return cookieStore.get(authConfig.cookieName)?.value || null;
}

export async function verifySession(session: string | undefined | null): Promise<DecodedIdToken | null> {
  if (!session) return null;
  try {
    const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
    return decodedIdToken;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}


export async function getLandlordId(sessionCookie: string | undefined): Promise<string | null> {
    if (!sessionCookie) return null;
    const decodedToken = await verifySession(sessionCookie);
    if (!decodedToken) return null;
    
    // If the user is a landlord, their UID is the landlordId
    if (decodedToken.role === 'landlord') {
        return decodedToken.uid;
    }
    // If the user is a manager, the landlordId is a custom claim
    if (decodedToken.role === 'manager' && decodedToken.landlordId) {
        return decodedToken.landlordId;
    }
    return null;
}

export async function getLandlordAndActor(sessionCookie: string): Promise<{ landlordId: string | null; actor: DecodedIdToken | null, error?: { message: string, statusCode: number } }> {
    const decodedToken = await verifySession(sessionCookie);
    if (!decodedToken) {
        return { landlordId: null, actor: null, error: { message: "Invalid session", statusCode: 401 } };
    }

    let landlordId: string | null = null;
    if (decodedToken.role === 'landlord') {
        landlordId = decodedToken.uid;
    } else if (decodedToken.role === 'manager' && decodedToken.landlordId) {
        landlordId = decodedToken.landlordId;
    }

    if (!landlordId) {
         return { landlordId: null, actor: decodedToken, error: { message: "Could not determine landlord context for this user.", statusCode: 403 } };
    }

    return { landlordId, actor: decodedToken };
}

export function createRequestContext(req: NextRequest) {
    return {
        ip: req.ip,
        geo: req.geo,
        userAgent: req.headers.get('user-agent'),
        method: req.method,
        path: req.nextUrl.pathname,
    };
}
