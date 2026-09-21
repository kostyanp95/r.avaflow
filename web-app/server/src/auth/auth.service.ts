import { ForbiddenException, Injectable } from '@nestjs/common';
import { authConfig } from './auth.config';
import { authStore } from './auth-store';
import {
  parseCookieHeader,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  mintSession,
  verifySession,
  TelegramUserPayload,
} from './tokens';

export interface AuthUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  admin: boolean;
}

function toAuthUser(tg: TelegramUserPayload): AuthUser {
  return {
    id: tg.id,
    username: tg.username,
    firstName: tg.firstName,
    lastName: tg.lastName,
    displayName: authStore.displayName(tg.id) || tg.firstName || tg.username || `User ${tg.id}`,
    admin: authConfig.isAdmin(tg.id),
  };
}

@Injectable()
export class AuthService {
  /** Session token for a verified Telegram user (also registers/updates them). */
  establishSession(tg: TelegramUserPayload): { token: string; user: AuthUser } {
    authStore.upsertUser(tg);
    return { token: mintSession(tg, authConfig.secret), user: toAuthUser(tg) };
  }

  /** Resolve a user from cookie / Authorization header, or null. */
  userFromRequest(req: { headers: Record<string, any> }): AuthUser | null {
    if (!authConfig.enabled) {
      // Legacy open mode: everyone is treated as an implicit admin so that
      // all pre-existing behaviour (seeing every project) is preserved.
      return { id: 0, displayName: 'anonymous', admin: true };
    }
    const cookies = parseCookieHeader(req.headers.cookie);
    let token = cookies[SESSION_COOKIE];
    const authHeader: string | undefined = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }
    if (!token) return null;
    const tg = verifySession(token, authConfig.secret);
    if (!tg) return null;
    if (!authConfig.isAllowed(tg.id)) return null; // revoked while session was alive
    return toAuthUser(tg);
  }

  /** Session cookie options matching the request scheme. */
  sessionCookieOptions(req: { headers: Record<string, any> }) {
    const isHttps =
      req.headers['x-forwarded-proto'] === 'https' || (req as any).secure === true;
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isHttps,
      path: '/',
      maxAge: SESSION_TTL_SEC * 1000,
    };
  }

  /**
   * Project-level access: admins see everything (including legacy projects
   * without an owner); regular users only their own projects.
   */
  assertProjectAccess(user: AuthUser | null, projectName: string): void {
    if (!authConfig.enabled || !user) return;
    const owner = authStore.getOwner(projectName);
    if (owner === null) {
      if (!user.admin) {
        throw new ForbiddenException(`Project "${projectName}" is not available`);
      }
      return;
    }
    if (owner !== user.id && !user.admin) {
      throw new ForbiddenException(`Project "${projectName}" is not available`);
    }
  }
}
