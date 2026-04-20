import { SignJWT } from "jose";

export interface TokenClaims {
  sub: string;
  email: string;
  role: string;
  [key: string]: any;
}

export async function mintToken(
  claims: Partial<TokenClaims> = {},
): Promise<string> {
  // Try multiple env var names and fallback to the project default
  const secret =
    process.env.JWT_SECRET ||
    "super-secret-template-key-change-me-in-production";

  const encodedSecret = new TextEncoder().encode(secret);

  const payload = {
    sub: "user:alice",
    email: "alice@demo.com",
    role: "admin",
    iss: "template-engine",
    aud: "template-rpc",
    ...claims,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("template-engine")
    .setAudience("template-rpc")
    .setExpirationTime("2h")
    .sign(encodedSecret);
}

export async function defaultTestToken(): Promise<string> {
  return mintToken();
}
