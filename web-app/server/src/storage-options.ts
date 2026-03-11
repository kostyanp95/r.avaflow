import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';

const projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
const defaultUploadsPath = path.join(projectsRoot, 'uploads');

if (!fs.existsSync(defaultUploadsPath)) {
  fs.mkdirSync(defaultUploadsPath, { recursive: true });
}

export const storageOptions = diskStorage({
  destination: (req, file, cb) => {
    const projectName = req.body?.projectName;
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
