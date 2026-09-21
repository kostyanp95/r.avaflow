// Environment-driven auth configuration, parsed once at startup.
//
//  TG_BOT_TOKEN    — bot token; enables the Telegram bot (getMe + polling).
//  TG_BOT_POLLING  — 'false' disables getUpdates polling on this container
//                    (Telegram allows exactly ONE poller per bot token, so in
//                    the classic+40G deployment only one service polls; the
//                    other one only verifies stateless login tokens).
//  TG_BOT_USERNAME — optional override so containers without the token can
//                    still render t.me deep links.
//  TG_AUTH_SECRET  — shared HMAC secret. Auth is ENABLED iff this is set.
//                    When unset the app behaves exactly as before (no auth).
//  TG_ADMIN_IDS    — comma-separated Telegram user ids that see all projects.
//  TG_ALLOWED_IDS  — optional registration allowlist (empty = anyone who
//                    reaches the bot may register).
import * as crypto from 'crypto';

function parseIdList(raw: string | undefined): Set<number> | null {
  if (!raw) return null;
  const ids = raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  return ids.length > 0 ? new Set(ids) : null;
}

const botToken = process.env.TG_BOT_TOKEN || '';
const authSecret = process.env.TG_AUTH_SECRET || '';
const devFallbackSecret = authSecret || botToken || '';

class AuthConfig {
  readonly botToken = botToken;
  readonly botPolling = botToken && process.env.TG_BOT_POLLING !== 'false';
  botUsername = process.env.TG_BOT_USERNAME || '';
  readonly adminIds = parseIdList(process.env.TG_ADMIN_IDS) || new Set<number>();
  readonly allowedIds = parseIdList(process.env.TG_ALLOWED_IDS);

  /** Auth is enabled only when a dedicated secret is configured. */
  readonly enabled = Boolean(authSecret);

  /**
   * Signing secret. TG_AUTH_SECRET is authoritative; the bot token and a
   * random value are last-resort fallbacks so a misconfigured single-node
   * deployment still works (sessions then do not survive restarts).
   */
  readonly secret = devFallbackSecret || crypto.randomBytes(32).toString('hex');

  isAdmin(tgId: number): boolean {
    return this.adminIds.has(tgId);
  }

  isAllowed(tgId: number): boolean {
    if (this.adminIds.has(tgId)) return true;
    return !this.allowedIds || this.allowedIds.has(tgId);
  }
}

export const authConfig = new AuthConfig();
