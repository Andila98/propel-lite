
import { admin } from "@/lib/firebase-admin";
import { authConfig } from "@/config/server-config";
import type { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthResult {
    decodedToken: DecodedIdToken;
    error: null;
}

export interface AuthError {
    decodedToken: null;
    error: NextResponse;
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
): Promise<AuthResult | AuthError> {
  const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.warn(`[API_AUTH_WARN] Unauthorized: No session cookie found for path: ${req.nextUrl.pathname}.`);
      return {
        decodedToken: null,
        error: NextResponse.json({ error: "Unauthorized: Missing session cookie." }, { status: 401 }),
      };
  }

  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    
    if (!decodedToken) {
        return {
          decodedToken: null,
          error: NextResponse.json({ error: "Unauthorized: Invalid session cookie." }, { status: 401 }),
        };
    }
    
    const userRole = decodedToken.role;
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      console.warn(
        `[API_AUTH_FORBIDDEN] UID: ${decodedToken.uid}, Role: '${userRole}' not in allowed roles [${allowedRoles.join(", ")}] for path: ${req.nextUrl.pathname}.`
      );
      return {
        decodedToken: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return { decodedToken, error: null };
  } catch (error: any) {
    console.error(`[API_AUTH_ERROR] Error verifying session cookie for path ${req.nextUrl.pathname}:`, {
      message: error.message,
      code: error.code,
    });
    return {
      decodedToken: null,
      error: NextResponse.json({ error: "Unauthorized: Session expired or invalid." }, { status: 401 }),
    };
  }
}
