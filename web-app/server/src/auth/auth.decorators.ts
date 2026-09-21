import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ADMIN_ONLY_KEY = 'auth:adminOnly';

/** Marks a route as reachable without a session (also skips admin checks). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Marks a route as admin-only (requires auth to be enabled). */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
