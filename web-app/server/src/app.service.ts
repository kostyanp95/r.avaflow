import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
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

export interface ProjectSummary {
  name: string;
  hasJson: boolean;
  hasScript: boolean;
}

@Injectable()
export class AppService {
  projectRasters: Array<Rasters>;
  private readonly dockerImage =
    process.env.AVAFLOW_DOCKER_IMAGE || 'r.avaflow:base';
  private readonly projectsVolume =
    process.env.AVAFLOW_PROJECTS_PATH ||
    path.resolve(__dirname, '..', '..', '..', 'projects');
  projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
  uploadsPath = path.join(this.projectsRoot, 'uploads');

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

    const stripExt = (f: string) => f.replace(/\.tiff?$/i, '');
    const importLine = (f: string) =>
      `r.in.gdal -o --overwrite input=DATA/${f} output=${stripExt(f)}\n`;

    const isValid = (v: any) => v && v !== 'null';

    let cmds = `g.region -d\n`;
    cmds += importLine(elevation);
    if (isValid(hrelease1)) cmds += importLine(hrelease1);
    if (isValid(hrelease2)) cmds += importLine(hrelease2);
    if (isValid(hrelease3)) cmds += importLine(hrelease3);
    if (isValid(hentrmax1)) cmds += importLine(hentrmax1);
    if (isValid(hentrmax2)) cmds += importLine(hentrmax2);
    if (isValid(hentrmax3)) cmds += importLine(hentrmax3);
    cmds += `\ng.region -s rast=${stripExt(elevation)}\n\n`;

    return cmds;
  }

  createExperiment(experiment: Experiment): string {
    const {
      cellsize,
      phases,
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
    } = experiment.parameters;

    if (!density) {
      throw new Error('Density is not defined in the experiment parameters.');
    }

    const stripExt = (f: string) => f.replace(/\.tiff?$/i, '');

    const { densityOfP1, densityOfP2, densityOfP3 } = density;
    const densityString = `${densityOfP1},${densityOfP2},${densityOfP3}`;

    const elevName = elevation ? stripExt(elevation) : null;

    let cmd = `r.avaflow -e -v prefix=${experiment.name} cellsize=${cellsize} phases=${phases}`;

    if (elevName) cmd += ` elevation=${elevName}`;

    const optionalRaster = (paramName: string, value: string | null | undefined) => {
      if (value && value !== 'null') cmd += ` ${paramName}=${stripExt(value)}`;
    };

    optionalRaster('hrelease1', hrelease1);
    optionalRaster('hrelease2', hrelease2);
    optionalRaster('hrelease3', hrelease3);
    optionalRaster('hentrmax1', hentrmax1);
    optionalRaster('hentrmax2', hentrmax2);
    optionalRaster('hentrmax3', hentrmax3);
    optionalRaster('impactarea', impactarea);

    cmd += ` density=${densityString}`;

    if (friction) {
      const vals = [
        friction.internalFrictionAngleOfP1,
        friction.internalFrictionAngleOfP2,
        friction.internalFrictionAngleOfP3,
        friction.basalFrictionAngleOfP1,
        friction.basalFrictionAngleOfP2,
        friction.basalFrictionAngleOfP3,
        friction.fluidFrictionOfP1,
        friction.fluidFrictionOfP2,
        friction.fluidFrictionOfP3,
      ];
      if (vals.some((v) => v != null)) {
        cmd += ` friction=${vals.map((v) => v ?? 0).join(',')}`;
      }
    }

    if (viscosity) {
      const vals = [
        viscosity.viscosityOfP1,
        viscosity.viscosityOfP2,
        viscosity.viscosityOfP3,
      ];
      if (vals.some((v) => v != null)) {
        cmd += ` viscosity=${vals.map((v) => v ?? 0).join(',')}`;
      }
    }

    cmd += ` time=${tint},${tend}\n`;

    return cmd;
  }

  async createBashScriptFile(
    projectData: Project,
  ): Promise<{ message: string; path: string }> {
    // If DATA is in a nested subdirectory, create a symlink so r.in.gdal finds it
    const symlinkSnippet =
      `# If DATA is in a nested subdirectory, create a symlink\n` +
      `if [ ! -d "DATA" ] && [ -d "${projectData.name}/DATA" ]; then\n` +
      `  ln -sf ${projectData.name}/DATA DATA\n` +
      `fi\n\n`;

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
      symlinkSnippet + initialCommands + experimentsScripts.join('\n') + '\ng.region -d';

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

  async getProjectByName(projectName: string): Promise<Project> {
    const jsonPath = path.join(this.projectsRoot, projectName, `${projectName}.json`);
    return this.readJsonFile(jsonPath);
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

  private runningProcess: ChildProcess | null = null;
  private containerName: string | null = null;

  runSimulation(projectName: string): { success: boolean; message: string } {
    if (this.runningProcess) {
      return { success: false, message: 'A simulation is already running' };
    }

    const containerName = `avaflow-${projectName}-${Date.now()}`;
    const shellCmd = `cd /r.avaflow/projects/${projectName} && bash ${projectName}.sh`;

    const child = spawn('docker', [
      'run', '--rm',
      '--name', containerName,
      '-v', `${this.projectsVolume}:/r.avaflow/projects`,
      this.dockerImage,
      'grass', '--tmp-project', 'XY', '--exec',
      'bash', '-c', shellCmd,
    ]);

    this.runningProcess = child;
    this.containerName = containerName;

    const emitLine = (line: string) => {
      this.appGateway.server.emit('simulationLog', {
        line,
        timestamp: Date.now(),
      });
    };

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(emitLine);
    });

    child.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(emitLine);
    });

    child.on('close', (exitCode: number) => {
      this.runningProcess = null;
      this.containerName = null;
      this.appGateway.server.emit('simulationDone', {
        projectName,
        exitCode: exitCode ?? 1,
        success: exitCode === 0,
      });
    });

    child.on('error', (err: Error) => {
      this.runningProcess = null;
      this.containerName = null;
      emitLine(`Error spawning Docker: ${err.message}`);
      this.appGateway.server.emit('simulationDone', {
        projectName,
        exitCode: 1,
        success: false,
      });
    });

    return { success: true, message: `Simulation started for project: ${projectName}` };
  }

  stopSimulation(): { success: boolean; message: string } {
    if (!this.runningProcess) {
      return { success: false, message: 'No simulation is currently running' };
    }

    this.runningProcess.kill();
    this.runningProcess = null;
    this.containerName = null;
    return { success: true, message: 'Simulation stop signal sent' };
  }

  async listProjectFiles(projectName: string): Promise<string[]> {
    const rasterExtensions = ['.tif', '.tiff', '.asc'];
    const isRaster = (f: string) =>
      rasterExtensions.includes(path.extname(f).toLowerCase());

    const results: string[] = [];

    // Try direct DATA/ path and one-level-deep nested path
    const basePaths = [
      path.join(this.projectsRoot, projectName, 'DATA'),
      path.join(this.projectsRoot, projectName, projectName, 'DATA'),
    ];

    for (const dataDir of basePaths) {
      if (!fs.existsSync(dataDir)) continue;

      const entries = await fsPromises.readdir(dataDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && isRaster(entry.name)) {
          results.push(entry.name);
        } else if (entry.isDirectory()) {
          // One level deep
          const subDir = path.join(dataDir, entry.name);
          const subEntries = await fsPromises.readdir(subDir, {
            withFileTypes: true,
          });
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && isRaster(subEntry.name)) {
              results.push(path.join(entry.name, subEntry.name));
            }
          }
        }
      }
    }

    return results;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    if (!fs.existsSync(this.projectsRoot)) return [];
    const entries = await fsPromises.readdir(this.projectsRoot, { withFileTypes: true });
    const projects: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'uploads') continue;
      const jsonPath = path.join(this.projectsRoot, entry.name, `${entry.name}.json`);
      const shPath = path.join(this.projectsRoot, entry.name, `${entry.name}.sh`);
      projects.push({
        name: entry.name,
        hasJson: fs.existsSync(jsonPath),
        hasScript: fs.existsSync(shPath),
      });
    }
    return projects;
  }

  async deleteProject(projectName: string): Promise<void> {
    const projectPath = path.join(this.projectsRoot, projectName);
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project "${projectName}" not found`);
    }
    await fsPromises.rm(projectPath, { recursive: true, force: true });
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
