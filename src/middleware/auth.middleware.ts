import { Request, Response, NextFunction } from "express";
import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

const client = jwksClient({
  jwksUri: process.env.CLERK_JWKS_URL!,
});

function getKey(header: JwtHeader, callback: any) {
  client.getSigningKey(header.kid!, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key!.getPublicKey();
    callback(null, signingKey);
  });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ["RS256"],
      issuer: process.env.CLERK_ISSUER,
    },
    (err, decoded) => {
      if (err || !decoded) {
        console.error("JWT verification failed:", err);
        return res.status(401).json({ error: "Invalid token" });
      }

      const payload = decoded as JwtPayload;

      if (!payload.sub) {
        return res.status(401).json({ error: "Invalid token payload" });
      }

      req.user = { id: payload.sub };
      next();
    }
  );
}
