import { getAuth } from "firebase-admin/auth";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/config/server-config";
import type { NextRequest } from "next/server";
import type { Tokens } from "next-firebase-auth-edge";

export interface AuthResult {
    tokens: Tokens;
    error: null;
}

export interface AuthError {
    tokens: null;
    error: Response;
}

/**
 * A robust utility to verify user authentication for API routes.
 * It wraps `getTokens` in a try-catch block to handle common errors
 * like missing or expired cookies, returning a proper `Unauthorized`
 * response instead of crashing the server.
 *
 * @param req The NextRequest object.
 * @param allowedRoles An array of roles that are allowed to access the route.
 * @returns A promise that resolves to either the user's tokens or an error Response.
 */
export async function verifyApiAuth(
  req: NextRequest,
  allowedRoles: string[] = []
): Promise<AuthResult | AuthError> {
  try {
    const tokens = await getTokens(req, authConfig);

    if (!tokens) {
      console.warn("[API_AUTH] No tokens found in request.");
      return {
        tokens: null,
        error: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      };
    }

    if (
      allowedRoles.length > 0 &&
      !allowedRoles.includes(tokens.decodedToken.role)
    ) {
      console.warn(
        `[API_AUTH] Forbidden: User role '${tokens.decodedToken.role}' not in allowed roles [${allowedRoles.join(", ")}].`
      );
      return {
        tokens: null,
        error: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        }),
      };
    }

    return { tokens, error: null };
  } catch (error: any) {
    console.error("[API_AUTH_ERROR] Error verifying token:", {
      message: error.message,
      code: error.code,
    });
    return {
      tokens: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    };
  }
}
