
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

type AllowedRoles = 'landlord' | 'manager' | 'tenant' | 'superadmin';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    uid: string;
    role: AllowedRoles;
    landlordId: string | null;
    token: DecodedIdToken;
  }
}

export function withRole(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>, 
  allowedRoles: AllowedRoles[]
) {
  return async function wrappedHandler(req: NextRequest, ...args: any[]) {
    try {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userRole = decodedToken.role as AllowedRoles;

      if (!userRole || !allowedRoles.includes(userRole)) {
        console.error(
            `[RBAC_VIOLATION] User ${decodedToken.uid} with role '${userRole}' attempted to access protected route: ${req.nextUrl.pathname}`
        );
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }
      
      const authenticatedRequest = req as AuthenticatedRequest;
      authenticatedRequest.user = {
        uid: decodedToken.uid,
        role: userRole,
        landlordId: decodedToken.landlordId || null,
        token: decodedToken,
      };

      // Pass along any additional arguments from the route handler (like params)
      return handler(authenticatedRequest, ...args);

    } catch (error: any) {
      console.error('[RBAC_ERROR]', error);
      let errorMessage = 'Unauthorized';
      if (error.code === 'auth/id-token-expired') {
        errorMessage = 'Token has expired';
      }
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
  };
}
