import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';

const projectFolder = 'TEST';
const projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
const projectPath = path.join(projectsRoot, projectFolder);
const dataPath = path.join(projectPath, 'DATA');

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

export const storageOptions = diskStorage({
  destination: dataPath,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// Оставшаяся часть вашего кода
