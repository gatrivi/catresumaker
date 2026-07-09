import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./tokens";
import type { UserRecord } from "./userStore";

export type AuthedRequest = Request & {
  user?: UserRecord;
  token?: string;
};

export function extractBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export function createAuthMiddleware(getUserById: (id: string) => UserRecord | undefined) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ success: false, error: "Login required." });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: "Session expired. Please log in again." });
      return;
    }
    const user = getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ success: false, error: "User not found." });
      return;
    }
    req.user = user;
    req.token = token;
    next();
  };
}

export function optionalAuthMiddleware(getUserById: (id: string) => UserRecord | undefined) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const token = extractBearer(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = getUserById(payload.userId);
        if (user) {
          req.user = user;
          req.token = token;
        }
      }
    }
    next();
  };
}
