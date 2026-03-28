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

// All raster parameter names recognized by r.avaflow
const RASTER_PARAMS = [
  'elevation', 'hrelease1', 'hrelease2', 'hrelease3',
  'hentrmax1', 'hentrmax2', 'hentrmax3',
  'impactarea', 'hdeposit', 'zones', 'trelease', 'trelstop',
  'vinx1', 'viny1', 'vinx2', 'viny2', 'vinx3', 'viny3',
  'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
  'addfri1', 'addfri2', 'addfri3',
  'coh1', 'coh2', 'coh3', 'ny1', 'ny2', 'ny3',
  'cdeform', 'zfrag', 'ambdrag', 'tslide',
  'centr', 'tstop',
  'ctrans12', 'ctrans13', 'ctrans23',
  'pbgr', 'pbgg', 'pbgb',
];

// Default values for array parameters
const ARRAY_DEFAULTS: Record<string, number[]> = {
  friction:       [40, 20, 0, 20, 10, 0, 0, 0, 0.05],
  cohesion:       [0, 0, 0],
  viscosity:      [0, 0, 0],
  deformation:    [1, 1, 1],
  slidepar:       [0, 0, 0, 0, 0, 0],
  shearing:       [0],
  fragmentation:  [0, 0],
  ambient:        [0],
  drag:           [1, 3, 1, 0.1, 1, 1],
  virtualmass:    [10, 0.12, 1],
  entrainment:    [-7.0, 0.0],
  transformation: [0, 0, 0],
  melting:        [0, 0, 0, 0.2, 0.5],
  thresholds:     [0.1, 10000, 10000, 1.0, 0.000001],
  cfl:            [0.4, 0.001],
  slomo:          [1.0, 1.0, 1.0],
};

// Default values for scalar parameters
const SCALAR_DEFAULTS: Record<string, number> = {
  ctopo: 0,
  limiter: 1,
  gravity: 9.81,
  cores: 8,
  clayers: 0,
  cdispersion: 0,
  csurface: 0,
  centrainment: 0,
  cstopping: 0,
  cmelt: 0,
  sampling: 100,
};

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

  // --- Validation helpers ---

  private sanitizeProjectName(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error(
        `Invalid project name "${name}": only alphanumeric characters and underscores are allowed`,
      );
    }
    return name;
  }

  private sanitizeFilename(filename: string): string {
    if (!/^[a-zA-Z0-9_./\-]+$/.test(filename)) {
      throw new Error(
        `Invalid filename "${filename}": only alphanumeric characters, underscores, dots, slashes, and hyphens are allowed`,
      );
    }
    return filename;
  }

  private validateNumber(value: any, paramName: string): number {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error(`Invalid numeric value for ${paramName}: ${value}`);
    }
    return num;
  }

  private stripExt(filename: string): string {
    return filename.replace(/\.(tiff?|asc)$/i, '');
  }

  // --- Old format migration ---

  private migrateParams(params: any): any {
    // Convert old nested density object to array
    if (params.density && !Array.isArray(params.density)) {
      params.density = [
        params.density.densityOfP1 ?? 2700,
        params.density.densityOfP2 ?? 1800,
        params.density.densityOfP3 ?? 1000,
      ];
    }
    // Convert old nested friction object to array
    if (params.friction && !Array.isArray(params.friction)) {
      params.friction = [
        params.friction.internalFrictionAngleOfP1 ?? 40,
        params.friction.internalFrictionAngleOfP2 ?? 20,
        params.friction.internalFrictionAngleOfP3 ?? 0,
        params.friction.basalFrictionAngleOfP1 ?? 20,
        params.friction.basalFrictionAngleOfP2 ?? 10,
        params.friction.basalFrictionAngleOfP3 ?? 0,
        params.friction.fluidFrictionOfP1 ?? 0,
        params.friction.fluidFrictionOfP2 ?? 0,
        params.friction.fluidFrictionOfP3 ?? 0.05,
      ];
    }
    // Convert old nested cohesion object to array
    if (params.cohesion && !Array.isArray(params.cohesion)) {
      params.cohesion = [
        params.cohesion.cohesionOfP1 ?? 0,
        params.cohesion.cohesionOfP2 ?? 0,
        params.cohesion.cohesionOfP3 ?? 0,
      ];
    }
    // Convert old nested viscosity object to array
    if (params.viscosity && !Array.isArray(params.viscosity)) {
      params.viscosity = [
        params.viscosity.viscosityOfP1 ?? 0,
        params.viscosity.viscosityOfP2 ?? 0,
        params.viscosity.viscosityOfP3 ?? 0,
      ];
    }
    // Convert old tint/tend to time array
    if (params.tint != null && params.tend != null && !params.time) {
      params.time = [params.tint, params.tend];
    }
    // Convert old phases string to number
    if (params.phases === 's,fs,f') params.phases = 3;
    if (params.phases === 's') params.phases = 1;

    return params;
  }

  // --- Script generation ---

  private collectRasterFiles(experiments: Experiment[]): string[] {
    const files = new Set<string>();
    for (const exp of experiments) {
      const p = exp.parameters;
      for (const paramName of RASTER_PARAMS) {
        const val = p[paramName];
        if (val && val !== 'null') {
          files.add(this.sanitizeFilename(val));
        }
      }
    }
    return Array.from(files);
  }

  createInitialCommands(
    projectName: string,
    experiments: Experiment[],
  ): string {
    const rasterFiles = this.collectRasterFiles(experiments);
    const elevationFile = experiments[0]?.parameters?.elevation;
    if (!elevationFile) {
      throw new Error('Elevation raster is required');
    }

    const safeName = this.sanitizeProjectName(projectName);

    let cmds = '';
    cmds += `# If DATA is in a nested subdirectory, create a symlink\n`;
    cmds += `if [ ! -d "DATA" ] && [ -d "${safeName}/DATA" ]; then\n`;
    cmds += `  ln -sf ${safeName}/DATA DATA\n`;
    cmds += `fi\n\n`;

    cmds += `g.region -d\n`;
    for (const file of rasterFiles) {
      cmds += `r.in.gdal -o --overwrite input=DATA/${file} output=${this.stripExt(file)}\n`;
    }
    cmds += `\ng.region -s rast=${this.stripExt(this.sanitizeFilename(elevationFile))}\n`;

    return cmds;
  }

  createExperiment(experiment: Experiment): string {
    const p = this.migrateParams({ ...experiment.parameters });

    // Validate required parameters
    if (!p.elevation) {
      throw new Error('Elevation raster is required');
    }
    if (!p.density || !Array.isArray(p.density) || p.density.length < 3) {
      throw new Error('Density array with 3 values is required');
    }
    if (!p.time || !Array.isArray(p.time) || p.time.length < 2) {
      throw new Error('Time array [tint, tend] is required');
    }

    // 1. Build flags
    let flags = '-e';
    if (p.flag_v) flags += ' -v';
    if (p.flag_k) flags += ' -k';
    if (p.flag_a) flags += ' -a';
    if (p.flag_t) flags += ' -t';
    if (p.flag_m) flags += ' -m';

    // 2. Phases mapping
    const phasesStr = p.phases === 1 ? 's' : 's,fs,f';

    // Start building command parts (will be joined with line continuations)
    const parts: string[] = [];

    // Flags + prefix + cellsize + phases (first line)
    parts.push(
      `r.avaflow ${flags} prefix=${this.sanitizeProjectName(experiment.name)} cellsize=${this.validateNumber(p.cellsize, 'cellsize')} phases=${phasesStr}`,
    );

    // 3. Elevation (always required)
    parts.push(`  elevation=${this.stripExt(this.sanitizeFilename(p.elevation))}`);

    // 4. Optional raster parameters (in canonical order, skip elevation)
    const optionalRasters = RASTER_PARAMS.filter((n) => n !== 'elevation');
    for (const paramName of optionalRasters) {
      const val = p[paramName];
      if (val && val !== 'null') {
        parts.push(
          `  ${paramName}=${this.stripExt(this.sanitizeFilename(val))}`,
        );
      }
    }

    // 5. Scalar controls (only if different from default)
    const scalarParams = [
      'ctopo', 'limiter', 'gravity', 'cores',
      'clayers', 'cdispersion', 'csurface',
      'centrainment', 'cstopping', 'cmelt',
    ];
    for (const paramName of scalarParams) {
      if (p[paramName] != null) {
        const val = this.validateNumber(p[paramName], paramName);
        if (val !== SCALAR_DEFAULTS[paramName]) {
          parts.push(`  ${paramName}=${val}`);
        }
      }
    }

    // sampling: only emitted if flag_m is true and value differs from default
    if (p.flag_m && p.sampling != null) {
      const val = this.validateNumber(p.sampling, 'sampling');
      if (val !== SCALAR_DEFAULTS.sampling) {
        parts.push(`  sampling=${val}`);
      }
    }

    // 6. Array material parameters
    // Helper: check if array differs from its default
    const arraysEqual = (a: number[], b: number[]): boolean => {
      if (a.length !== b.length) return false;
      return a.every((v, i) => v === b[i]);
    };

    const emitArray = (name: string, values: number[] | null | undefined) => {
      if (!values || !Array.isArray(values)) return;
      values.forEach((v, i) => this.validateNumber(v, `${name}[${i}]`));
      parts.push(`  ${name}=${values.join(',')}`);
    };

    const emitArrayIfChanged = (
      name: string,
      values: number[] | null | undefined,
    ) => {
      if (!values || !Array.isArray(values)) return;
      const defaults = ARRAY_DEFAULTS[name];
      if (!defaults || !arraysEqual(values, defaults)) {
        emitArray(name, values);
      }
    };

    // density — ALWAYS emit
    emitArray('density', p.density);

    // Other array params — emit only when changed from defaults
    emitArrayIfChanged('friction', p.friction);
    emitArrayIfChanged('cohesion', p.cohesion);
    emitArrayIfChanged('viscosity', p.viscosity);
    emitArrayIfChanged('deformation', p.deformation);
    emitArrayIfChanged('slidepar', p.slidepar);
    emitArrayIfChanged('shearing', p.shearing);
    emitArrayIfChanged('fragmentation', p.fragmentation);
    emitArrayIfChanged('ambient', p.ambient);
    emitArrayIfChanged('drag', p.drag);
    emitArrayIfChanged('virtualmass', p.virtualmass);

    // entrainment: emit if centrainment=1 OR values differ from default
    if (p.entrainment && Array.isArray(p.entrainment)) {
      const defaults = ARRAY_DEFAULTS.entrainment;
      if (p.centrainment === 1 || !arraysEqual(p.entrainment, defaults)) {
        emitArray('entrainment', p.entrainment);
      }
    }

    // thresholds, cfl, slomo
    emitArrayIfChanged('thresholds', p.thresholds);
    emitArrayIfChanged('cfl', p.cfl);
    emitArrayIfChanged('slomo', p.slomo);

    // 7. Phase transformation
    emitArrayIfChanged('transformation', p.transformation);

    // melting: emit if cmelt=1 OR values differ from default
    if (p.melting && Array.isArray(p.melting)) {
      const defaults = ARRAY_DEFAULTS.melting;
      if (p.cmelt === 1 || !arraysEqual(p.melting, defaults)) {
        emitArray('melting', p.melting);
      }
    }

    // 8. Special parameters
    if (p.aoicoords && Array.isArray(p.aoicoords) && p.aoicoords.length === 4) {
      p.aoicoords.forEach((v: any, i: number) =>
        this.validateNumber(v, `aoicoords[${i}]`),
      );
      parts.push(`  aoicoords=${p.aoicoords.join(',')}`);
    }

    if (p.rhrelease1 != null) {
      parts.push(`  rhrelease1=${this.validateNumber(p.rhrelease1, 'rhrelease1')}`);
    }
    if (p.vhrelease && Array.isArray(p.vhrelease)) {
      parts.push(`  vhrelease=${p.vhrelease.join(',')}`);
    }
    if (p.rhentrmax1 != null) {
      parts.push(`  rhentrmax1=${this.validateNumber(p.rhentrmax1, 'rhentrmax1')}`);
    }
    if (p.vhentrmax && Array.isArray(p.vhentrmax)) {
      parts.push(`  vhentrmax=${p.vhentrmax.join(',')}`);
    }

    // 9. Text parameters
    const textParams = [
      'hydrograph', 'hydrocoords', 'frictiograph',
      'transformograph', 'profile', 'ctrlpoints',
    ];
    for (const paramName of textParams) {
      const val = p[paramName];
      if (val && val !== 'null' && String(val).trim() !== '') {
        parts.push(`  ${paramName}=${String(val).trim()}`);
      }
    }

    // 10. Visualization
    if (p.visualization && Array.isArray(p.visualization)) {
      parts.push(`  visualization=${p.visualization.join(',')}`);
    }

    // 11. time — ALWAYS LAST
    const tint = this.validateNumber(p.time[0], 'time[0]');
    const tend = this.validateNumber(p.time[1], 'time[1]');
    parts.push(`  time=${tint},${tend}`);

    // Join with backslash-newline continuations
    return parts.join(' \\\n') + '\n';
  }

  async createBashScriptFile(
    projectData: Project,
  ): Promise<{ message: string; path: string }> {
    const safeName = this.sanitizeProjectName(projectData.name);

    // Migrate params for all experiments
    for (const exp of projectData.experiments) {
      exp.parameters = this.migrateParams(exp.parameters);
    }

    const initialCommands =
      projectData.experiments.length > 0
        ? this.createInitialCommands(safeName, projectData.experiments)
        : '';

    const experimentsScripts = projectData.experiments.map(
      (experiment, index) => {
        const experimentScript = this.createExperiment(experiment);
        return `\n# ${index + 1} ${this.sanitizeProjectName(experiment.name)}\n` + experimentScript;
      },
    );

    const script =
      initialCommands + experimentsScripts.join('') + '\ng.region -d\n';

    const projectsRoot = path.join(__dirname, '..', '..', '..', 'projects');
    const projectPath = path.join(projectsRoot, safeName);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const scriptPath = path.join(projectPath, `${safeName}.sh`);
    const jsonPath = path.join(projectPath, `${safeName}.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(projectData, null, 2));

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
    const safeName = this.sanitizeProjectName(projectName);
    const jsonPath = path.join(this.projectsRoot, safeName, `${safeName}.json`);
    const project: Project = await this.readJsonFile(jsonPath);
    // Migrate old format when loading
    for (const exp of project.experiments) {
      exp.parameters = this.migrateParams(exp.parameters);
    }
    return project;
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
