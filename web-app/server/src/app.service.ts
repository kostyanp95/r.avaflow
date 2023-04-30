import { Injectable } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

export interface Rasters {
  name: string;
  path: string;
}

@Injectable()
export class AppService {
  projectRasters: Array<Rasters>;
  projectFolder = 'TEST'; // Замените на название папки проекта
  projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
  projectPath = path.join(this.projectsRoot, this.projectFolder);
  dataPath = path.join(this.projectPath, 'DATA');
  uploadsPath = this.dataPath;

  constructor(private readonly appGateway: AppGateway) {}

  getHello(): string {
    return 'Hello World!';
  }

  createExperiment(obj: any): string {
    const imports = [
      `g.region -d`,
      `r.in.gdal -o --overwrite input=DATA/${obj.elevation} output=ba_elevation`,
      obj.hrelease1 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hrelease1} output=ba_hrelease1`,
      obj.hrelease2 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hrelease2} output=ba_hrelease2`,
      obj.hrelease3 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hrelease3} output=ba_hrelease3`,
      obj.hentrmax1 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hentrmax1} output=ba_hentrmax1`,
      obj.hentrmax2 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hentrmax2} output=ba_hentrmax2`,
      obj.hentrmax3 &&
        `r.in.gdal -o --overwrite input=DATA/${obj.hentrmax3} output=ba_hentrmax3`,
    ]
      .filter(Boolean)
      .join('\n');

    const density = `${obj.density.densityOfP1},${obj.density.densityOfP2},${obj.density.densityOfP3}`;
    const phases = [obj.P1, obj.P2, obj.P3].filter(Boolean).join(',');

    const avaflowCommand = [
      `g.region -s rast=ba_elevation`,
      ``, // добавьте пустую строку для отступа
      `r.avaflow -e -v`,
      `cellsize=${obj.cellize}`,
      `phases=${phases}`,
      `elevation=ba_elevation`,
      obj.hrelease1 && `hrelease1=ba_hrelease1`,
      obj.hrelease2 && `hrelease2=ba_hrelease2`,
      obj.hrelease3 && `hrelease3=ba_hrelease3`,
      obj.hentrmax1 && `hentrmax1=ba_hentrmax1`,
      obj.hentrmax2 && `hentrmax2=ba_hentrmax2`,
      obj.hentrmax3 && `hentrmax3=ba_hentrmax3`,
      `density=${density}`,
      `time=${obj.tint},${obj.tend}`,
    ]
      .filter(Boolean)
      .join(' ');

    const cleanup = 'g.region -d';

    // Обновите эту строку, чтобы добавить новую строку перед и после команды avaflow
    return [imports, '\n', avaflowCommand, '\n', cleanup].join('\n');
  }

  async createBashScriptFile(
    obj: any,
  ): Promise<{ message: string; path: string }> {
    const uploadDir = './uploads';

    // Создать директорию, если она еще не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const script = this.createExperiment(obj);

    const projectFolder = 'TEST'; // замените на название папки проекта
    const projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
    const projectPath = path.join(projectsRoot, projectFolder);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const scriptPath = path.join(projectPath, 'generated_script.sh');

    return new Promise((resolve, reject) => {
      fs.writeFile(scriptPath, script, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ message: 'Script saved successfully', path: scriptPath });
        }
      });
    });
  }

  async saveFiles(files: Express.Multer.File[]): Promise<any> {
    const filesInfo = files.map((file) => ({
      name: file.originalname,
      path: file.path,
    }));

    this.appGateway.server.emit('filesUploaded', { filesUploaded: filesInfo });

    return {
      message: 'Files uploaded successfully',
      files: filesInfo,
    };
  }

  async checkUploadsDirectory(): Promise<void> {
    const files = await fsPromises.readdir(this.uploadsPath, {
      encoding: 'utf8',
    });
    const filesInfo = files.map((file) => ({
      name: file,
      path: path.join(this.uploadsPath, file),
    }));

    this.projectRasters = filesInfo;

    if (filesInfo.length > 0) {
      this.appGateway.server.emit('filesUploaded', {
        filesUploaded: filesInfo,
      });
    }
  }
}
