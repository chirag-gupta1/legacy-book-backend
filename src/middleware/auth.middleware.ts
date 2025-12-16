import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

const jwksUrl = process.env.CLERK_JWKS_URL!;
const issuer = process.env.CLERK_ISSUER!;

if (!jwksUrl || !issuer) {
  throw new Error("Clerk auth environment variables not set");
}

const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
    });

    // Clerk puts the user ID in `sub`
    if (!payload.sub) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      id: payload.sub,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
