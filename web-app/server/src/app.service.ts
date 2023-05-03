import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { AppGateway } from './app.gateway';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export interface Project {
  name: string;
  experiments: Array<Experiment>;
}

export interface Experiment {
  name: string;
  // TODO: Make interface ExperimentParameter
  parameters: any;
}

export interface Rasters {
  name: string;
  path: string;
}

@Injectable()
export class AppService {
  projectRasters: Array<Rasters>;
  projectFolder = 'TEST';
  projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
  projectPath = path.join(this.projectsRoot, this.projectFolder);
  dataPath = path.join(this.projectPath, 'DATA');
  uploadsPath = this.dataPath;

  constructor(private readonly appGateway: AppGateway) {}

  getHello(): string {
    return 'Hello World!';
  }

  createInitialCommands(experiment: Experiment): string {
    const {
      elevation,
      hrelease1,
      hrelease2,
      hrelease3,
      hentrmax1,
      hentrmax2,
      hentrmax3,
    } = experiment.parameters;

    return `g.region -d\n
g.region -s rast=${elevation}\n
r.in.gdal -o --overwrite input=DATA/${elevation} output=${elevation.slice(
      0,
      -4,
    )}\nr.in.gdal -o --overwrite input=DATA/${hrelease1} output=${hrelease1.slice(
      0,
      -4,
    )}${
      hrelease2
        ? `r.in.gdal -o --overwrite input=DATA/${hrelease2} output=${hrelease2.slice(
            0,
            -4,
          )}`
        : ''
    }
${
  hrelease3
    ? `r.in.gdal -o --overwrite input=DATA/${hrelease3} output=${hrelease3.slice(
        0,
        -4,
      )}`
    : ''
}
r.in.gdal -o --overwrite input=DATA/${hentrmax1} output=${hentrmax1.slice(
      0,
      -4,
    )}\n${
      hentrmax2
        ? `r.in.gdal -o --overwrite input=DATA/${hentrmax2} output=${hentrmax2.slice(
            0,
            -4,
          )}\n`
        : ''
    }${
      hentrmax3
        ? `r.in.gdal -o --overwrite input=DATA/${hentrmax3} output=${hentrmax3.slice(
            0,
            -4,
          )}`
        : ''
    }\n\n`;
  }

  createExperiment(experiment: Experiment): string {
    console.log(experiment);
    const {
      cellize,
      elevation,
      hrelease1,
      hrelease2,
      hrelease3,
      hentrmax1,
      hentrmax2,
      hentrmax3,
      density,
      friction,
      viscosity,
      impactarea,
      tint,
      tend,
      rhentrmax1,
    } = experiment.parameters;

    if (!density) {
      throw new Error('Density is not defined in the experiment parameters.');
    }

    const { densityOfP1, densityOfP2, densityOfP3 } = density;

    const densityString = `${densityOfP1},${densityOfP2},${densityOfP3}`;

    const rAvaflowCommand = `r.avaflow -e -v cellsize=${cellize} phases=${experiment.parameters.P1},${experiment.parameters.P2},${experiment.parameters.P3} elevation=${elevation} hrelease1=${hrelease1} hrelease2=${hrelease2} hrelease3=${hrelease3} hentrmax1=${hentrmax1} hentrmax2=${hentrmax2} hentrmax3=${hentrmax3} rhentrmax1=${rhentrmax1} density=${densityString} time=${tint},${tend}\n`;

    return rAvaflowCommand;
  }

  async createBashScriptFile(
    projectData: Project,
  ): Promise<{ message: string; path: string }> {
    const initialCommands =
      projectData.experiments.length > 0
        ? this.createInitialCommands(projectData.experiments[0])
        : '';

    // Создайте r.avaflow команды для каждого эксперимента
    const experimentsScripts = projectData.experiments.map(
      (experiment, index) => {
        const experimentScript = this.createExperiment(experiment);
        return `# ${index + 1} ${experiment.name}\n` + experimentScript;
      },
    );

    const script =
      initialCommands + experimentsScripts.join('\n') + '\ng.region -d';

    // Уберите отступы перед первым экспериментом
    const scriptWithoutInitialIndent = script.replace(/\n\n# 1/, '\n# 1');

    const projectFolder = projectData.name; // используйте имя проекта
    const projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
    const projectPath = path.join(projectsRoot, projectFolder);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const scriptPath = path.join(projectPath, `${projectData.name}.sh`); // исправлено
    const jsonPath = path.join(projectPath, `${projectData.name}.json`); // исправлено

    // Сохраните JSON-файл с параметрами объекта
    fs.writeFileSync(jsonPath, JSON.stringify(projectData, null, 2)); // исправлено

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

  async readJsonFile(filePath: string): Promise<any> {
    try {
      const data = await readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(data);
      return jsonData;
    } catch (error) {
      throw new Error(`Error reading JSON file: ${error}`);
    }
  }

  async checkProjectDataDirectory(): Promise<void> {
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
