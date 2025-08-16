
import { auth as adminAuth } from "@/lib/firebase-admin";
import { authConfig } from "@/config/server-config";
import { NextResponse, type NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";

export interface AuthResult {
    decodedToken: DecodedIdToken;
    error: null;
}

export interface AuthError {
    decodedToken: null;
    error: { error: string, status: number };
}

async function verifySessionCookie(sessionCookie: string | undefined, path: string): Promise<AuthResult | AuthError> {
  if (!sessionCookie) {
      console.warn(`[AUTH_WARN] Path: ${path} - Unauthorized: No session cookie found.`);
      return {
        decodedToken: null,
        error: { error: "Unauthorized: Missing session cookie.", status: 401 },
      };
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    if (!decodedToken) {
        return {
          decodedToken: null,
          error: { error: "Unauthorized: Invalid session cookie.", status: 401 },
        };
    }
    
    return { decodedToken, error: null };

  } catch (error: any) {
    console.error(`[AUTH_ERROR] Path: ${path} - Error verifying session cookie:`, {
      message: error.message,
      code: error.code,
    });
    return {
      decodedToken: null,
      error: { error: "Unauthorized: Session expired or invalid.", status: 401 },
    };
  }
}

/**
 * A robust utility to verify user authentication for API routes.
 * It verifies the session cookie from the request and checks roles.
 *
 * @param req The NextRequest object.
 * @param allowedRoles An array of roles that are allowed to access the route.
 * @returns A promise that resolves to either the decoded token or an error Response.
 */
export async function verifyApiAuth(
  req: NextRequest,
  allowedRoles: string[] = []
) {
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const authCheck = await verifySessionCookie(sessionCookie, req.nextUrl.pathname);

    if (authCheck.error) {
        return { decodedToken: null, error: NextResponse.json({ error: authCheck.error.error }, { status: authCheck.error.status }) };
    }
    
    const { decodedToken } = authCheck;
    const userRole = decodedToken.role;
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      console.warn(
        `[API_AUTH_FORBIDDEN] UID: ${decodedToken.uid}, Role: '${userRole}' not in allowed roles [${allowedRoles.join(", ")}] for path: ${req.nextUrl.pathname}.`
      );
      return { decodedToken: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return { decodedToken, error: null };
}

/**
 * A utility to verify user authentication for Server Actions.
 * It reads the session cookie from the 'next/headers' and checks roles.
 *
 * @param allowedRoles An array of roles that are allowed to access the action.
 * @returns A promise that resolves to either the decoded token or an error object.
 */
export async function verifyServerActionAuth(
  allowedRoles: string[] = []
): Promise<{ decodedToken: DecodedIdToken } | { error: { error: string, status: number } }> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(authConfig.cookieName)?.value;
  const authCheck = await verifySessionCookie(sessionCookie, "Server Action");

  if (authCheck.error) {
    return { error: { error: authCheck.error.error, status: authCheck.error.status } };
  }

  const { decodedToken } = authCheck;
  const userRole = decodedToken.role;

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.warn(
      `[SERVER_ACTION_FORBIDDEN] UID: ${decodedToken.uid}, Role: '${userRole}' not in allowed roles [${allowedRoles.join(", ")}] for Server Action.`
    );
    return {
      error: { error: "Forbidden", status: 403 },
    };
  }

  return { decodedToken };
}
