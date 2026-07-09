import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function b64url(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function unb64url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function secret(): string {
  const s = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }
  return s || "dev-only-change-me-before-sharing";
}

export type TokenPayload = {
  userId: string;
  email: string;
  exp: number;
};

export function signToken(payload: Omit<TokenPayload, "exp">): string {
  const body: TokenPayload = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret()).update(`${header}.${payloadPart}`).digest("base64url");
  return `${header}.${payloadPart}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payloadPart, sig] = parts;
  const expected = createHmac("sha256", secret()).update(`${header}.${payloadPart}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(unb64url(payloadPart)) as TokenPayload;
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
