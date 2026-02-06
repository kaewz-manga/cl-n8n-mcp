import * as OTPAuth from 'otpauth';
import { SignJWT, jwtVerify } from 'jose';

// JWT secret reference — set by configureJwt() in auth-service.ts
// We need to share it, so import getSecretKey pattern
let _jwtSecret: string = 'development-jwt-secret-change-in-production';

export function configureTotpJwt(secret: string): void {
  _jwtSecret = secret;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(_jwtSecret);
}

/**
 * Generate a new TOTP secret and otpauth URI for QR code
 */
export function generateTotpSecret(email: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: 'cl-n8n-mcp',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Verify a 6-digit TOTP code against a base32 secret
 * window=1 allows codes from t-30s and t+30s for clock skew
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'cl-n8n-mcp',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Generate a short-lived pending token for TOTP verification during login.
 * This token cannot be used as a full auth token (lacks planId/isAdmin).
 */
export async function generatePendingToken(userId: string, email: string): Promise<string> {
  return await new SignJWT({
    userId,
    email,
    purpose: 'totp_verify',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 300) // 5 minutes
    .sign(getSecretKey());
}

/**
 * Verify a pending TOTP token and return the userId/email
 */
export async function verifyPendingToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const data = payload as Record<string, unknown>;

    if (data.purpose !== 'totp_verify') {
      return null;
    }

    return {
      userId: data.userId as string,
      email: data.email as string,
    };
  } catch {
    return null;
  }
}
