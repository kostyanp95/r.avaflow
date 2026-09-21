// File-backed store for registered users and project ownership.
// Lives at <projectsRoot>/.ravaflow-auth.json — a hidden FILE inside the
// projects directory, therefore invisible to listProjects() (which only
// looks at directories) and persisted on the same Docker volume as projects,
// surviving container rebuilds. Atomic writes via tmp+rename.
import * as fs from 'fs';
import * as path from 'path';
import { resolveProjectsRoot } from '../paths';
import { TelegramUserPayload } from './tokens';

interface StoredUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  createdAt: number;
  lastSeenAt: number;
}

interface StoreData {
  users: Record<string, StoredUser>;
  owners: Record<string, number>;
}

export class AuthStore {
  private readonly filePath = path.join(
    resolveProjectsRoot(),
    '.ravaflow-auth.json',
  );
  private data: StoreData = { users: {}, owners: {} };
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          this.data = {
            users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
            owners: parsed.owners && typeof parsed.owners === 'object' ? parsed.owners : {},
          };
        }
      }
    } catch (err) {
      console.error('[auth] failed to read auth store, starting empty:', (err as Error).message);
    }
  }

  private save(): void {
    this.ensureLoaded();
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[auth] failed to write auth store:', (err as Error).message);
    }
  }

  upsertUser(tg: TelegramUserPayload): StoredUser {
    this.ensureLoaded();
    const key = String(tg.id);
    const now = Date.now();
    const existing = this.data.users[key];
    const user: StoredUser = {
      id: tg.id,
      username: tg.username ?? existing?.username,
      firstName: tg.firstName ?? existing?.firstName,
      lastName: tg.lastName ?? existing?.lastName,
      createdAt: existing?.createdAt ?? now,
      lastSeenAt: now,
    };
    this.data.users[key] = user;
    this.save();
    return user;
  }

  getUser(tgId: number): StoredUser | undefined {
    this.ensureLoaded();
    return this.data.users[String(tgId)];
  }

  listUsers(): StoredUser[] {
    this.ensureLoaded();
    return Object.values(this.data.users).sort((a, b) =>
      this.displayName(a.id).localeCompare(this.displayName(b.id)),
    );
  }

  getOwner(projectName: string): number | null {
    this.ensureLoaded();
    const owner = this.data.owners[projectName];
    return typeof owner === 'number' ? owner : null;
  }

  setOwner(projectName: string, tgId: number): void {
    this.ensureLoaded();
    this.data.owners[projectName] = tgId;
    this.save();
  }

  removeOwner(projectName: string): void {
    this.ensureLoaded();
    if (projectName in this.data.owners) {
      delete this.data.owners[projectName];
      this.save();
    }
  }

  displayName(tgId: number | null | undefined): string {
    if (tgId == null) return '';
    this.ensureLoaded();
    const user = this.data.users[String(tgId)];
    if (!user) return `User ${tgId}`;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (name) return user.username ? `${name} (@${user.username})` : name;
    return user.username ? `@${user.username}` : `User ${tgId}`;
  }
}

/** Singleton: also used from non-DI contexts (multer storage-options). */
export const authStore = new AuthStore();
