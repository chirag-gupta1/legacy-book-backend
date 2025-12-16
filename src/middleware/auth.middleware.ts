// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

const client = jwksClient({
  jwksUri: process.env.CLERK_JWKS_URL || "",
});

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const ISSUER = process.env.CLERK_ISSUER;
  const JWKS_URL = process.env.CLERK_JWKS_URL;

  // ✅ Validate env vars at request-time, not import-time
  if (!ISSUER || !JWKS_URL) {
    return res
      .status(500)
      .json({ error: "Auth not configured on server" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const key = await client.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const payload = jwt.verify(token, signingKey, {
      issuer: ISSUER,
    }) as any;

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
