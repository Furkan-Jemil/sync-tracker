import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Extracts and verifies the JWT token from the request cookies or Authorization header.
 * Returns the decoded user payload, or null if invalid.
 */
export function getUserFromRequest(req: NextRequest): AuthenticatedUser | null {
  try {
    let token = req.cookies.get("token")?.value;

    if (!token) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    console.error("[AUTH_ERROR] Invalid or expired token", error);
    return null;
  }
}

/**
 * Helper to wrap route handlers requiring authentication.
 */
export function withAuth(
  handler: (req: NextRequest, user: AuthenticatedUser, params?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, user, context?.params);
  };
}
