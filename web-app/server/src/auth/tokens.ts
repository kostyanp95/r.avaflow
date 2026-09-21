// Token primitives for Telegram-bot authorization — zero external deps.
//
// Two token kinds share one HS256 JWS-style envelope (header.payload.signature):
//  - "login" tokens: minted by the Telegram bot when a user presses Start,
//    delivered back to the browser via a deep-link URL or pasted as a code.
//    Short-lived (10 min), verified statelessly by any container that holds
//    the same TG_AUTH_SECRET — no shared DB between classic/40G needed.
//  - "sess" tokens: long-lived browser sessions stored in an httpOnly cookie.
import * as crypto from 'crypto';

export interface TelegramUserPayload {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export const SESSION_COOKIE = 'ravaflow_session';
export const LOGIN_TOKEN_TTL_SEC = 10 * 60; // one-time bot code: 10 minutes
export const SESSION_TTL_SEC = 30 * 24 * 3600; // "remember me": 30 days

function b64json(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

function sign(payloadPart: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadPart)
    .digest()
    .toString('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return (
    bufA.length === bufB.length &&
    crypto.timingSafeEqual(bufA, bufB)
  );
}

function mint(payload: Record<string, unknown>, secret: string): string {
  const header = b64json({ alg: 'HS256', typ: 'JWT' });
  const body = b64json(payload);
  return `${header}.${body}.${sign(`${header}.${body}`, secret)}`;
}

function verify(token: string, secret: string): Record<string, any> | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return null;
  if (!safeEqual(signature, sign(`${header}.${body}`, secret))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function mintLoginToken(
  user: TelegramUserPayload,
  secret: string,
): string {
  return mint(
    {
      t: 'login',
      id: user.id,
      un: user.username ?? null,
      fn: user.firstName ?? null,
      ln: user.lastName ?? null,
      iat: nowSec(),
      exp: nowSec() + LOGIN_TOKEN_TTL_SEC,
    },
    secret,
  );
}

export function verifyLoginToken(
  token: string,
  secret: string,
): TelegramUserPayload | null {
  const payload = verify(token, secret);
  if (!payload || payload.t !== 'login' || typeof payload.id !== 'number') {
    return null;
  }
  return {
    id: payload.id,
    username: payload.un ?? undefined,
    firstName: payload.fn ?? undefined,
    lastName: payload.ln ?? undefined,
  };
}

export function mintSession(
  user: TelegramUserPayload,
  secret: string,
): string {
  return mint(
    {
      t: 'sess',
      sub: user.id,
      un: user.username ?? null,
      fn: user.firstName ?? null,
      ln: user.lastName ?? null,
      iat: nowSec(),
      exp: nowSec() + SESSION_TTL_SEC,
    },
    secret,
  );
}

export function verifySession(
  token: string,
  secret: string,
): TelegramUserPayload | null {
  const payload = verify(token, secret);
  if (!payload || payload.t !== 'sess' || typeof payload.sub !== 'number') {
    return null;
  }
  return {
    id: payload.sub,
    username: payload.un ?? undefined,
    firstName: payload.fn ?? undefined,
    lastName: payload.ln ?? undefined,
  };
}

/**
 * Official Telegram Login Widget verification.
 * https://core.telegram.org/widgets/login#checking-authorization
 * Enabled as a forward-compatible path: works once the public domain is
 * authorized in BotFather; the bot-code flow needs no BotFather setup.
 */
export function verifyTelegramLoginWidget(
  botToken: string,
  query: Record<string, any>,
): TelegramUserPayload | null {
  const { hash, ...rest } = query;
  if (!hash || typeof hash !== 'string') return null;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');
  if (!safeEqual(hash, expected)) return null;
  const authDate = parseInt(rest.auth_date, 10);
  if (!isFinite(authDate) || nowSec() - authDate > 86400) return null;
  const id = parseInt(rest.id, 10);
  if (!isFinite(id)) return null;
  return {
    id,
    username: rest.username || undefined,
    firstName: rest.first_name || undefined,
    lastName: rest.last_name || undefined,
  };
}

export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
