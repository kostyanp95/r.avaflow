import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { resolveProjectsRoot } from './paths';
import { authConfig } from './auth/auth.config';
import { authStore } from './auth/auth-store';

const projectsRoot = resolveProjectsRoot();
const defaultUploadsPath = path.join(projectsRoot, 'uploads');

if (!fs.existsSync(defaultUploadsPath)) {
  fs.mkdirSync(defaultUploadsPath, { recursive: true });
}

export const storageOptions = diskStorage({
  destination: (req, file, cb) => {
    const projectName = req.body?.projectName;
    if (projectName && !/^[a-zA-Z0-9_]+$/.test(projectName)) {
      return cb(new Error(`Invalid project name: ${projectName}`), '');
    }

    // Per-user project isolation: uploading into a project owned by another
    // user is rejected. Runs before multer writes anything to disk; the auth
    // guard has already attached req.user (guards precede interceptors).
    if (projectName && authConfig.enabled) {
      const user = (req as any).user as { id: number; admin: boolean } | undefined;
      const owner = authStore.getOwner(projectName);
      if (owner !== null) {
        if (!user || (owner !== user.id && !user.admin)) {
          return cb(
            new Error(`Access to project "${projectName}" denied`),
            '',
          );
        }
      }
    }

    let dest: string;
    if (projectName) {
      dest = path.join(projectsRoot, projectName, 'DATA');
    } else {
      dest = defaultUploadsPath;
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
