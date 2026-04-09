import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as http from 'http';
import { spawn, ChildProcess, execSync } from 'child_process';
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

export interface ResultFile {
  name: string;
  path: string;
  type: 'image' | 'animation' | 'data' | 'raster';
  size: number;
}

// All raster parameter names recognized by r.avaflow (v3 + 40G)
const RASTER_PARAMS = [
  'elevation',
  'hrelease', 'hrelease1', 'hrelease2', 'hrelease3',
  'hentrmax', 'hentrmax1', 'hentrmax2', 'hentrmax3',
  'impactarea', 'hdeposit', 'zones', 'trelease', 'trelstop',
  'vinx', 'viny',
  'vinx1', 'viny1', 'vinx2', 'viny2', 'vinx3', 'viny3',
  'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
  'tufri', 'flufri', 'cvshear', 'deltab',
  'addfri1', 'addfri2', 'addfri3',
  'coh1', 'coh2', 'coh3', 'ny1', 'ny2', 'ny3',
  'cdeform', 'zfrag', 'ambdrag', 'tslide',
  'centr', 'tstop',
  'ctrans12', 'ctrans13', 'ctrans23',
  'pbgr', 'pbgg', 'pbgb',
];

// Web-app internal array defaults (used for migration and diffing)
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
  private readonly avaflowModule = process.env.AVAFLOW_MODULE || 'r.avaflow';
  projectsRoot =
    process.env.AVAFLOW_PROJECTS_PATH ||
    path.resolve(__dirname, '..', '..', '..', 'projects');
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
    // Convert numeric phases to v3 string format
    if (params.phases === 3) params.phases = 's,fs,f';
    if (params.phases === 1) params.phases = 's';

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

  // --- v3 translation helpers ---

  /**
   * Translate web-app friction[9] to v3 friction[7] for model=7.
   * Web-app: [phi1, phi2, phi3, delta1, delta2, delta3, fl1, fl2, fl3]
   * v3:      [phi1, delta1, phi2, delta2, phi3, delta3, flufri]
   */
  private translateFrictionToV3(f: number[]): number[] {
    if (!f || f.length < 9) return f;
    return [f[0], f[3], f[1], f[4], f[2], f[5], f[8]];
  }

  /**
   * Translate web-app viscosity[3] to v3 viscosity[6] for model=7.
   * Web-app: [v_solid, v_finesolid, v_fluid]
   * v3:      [ny_ss, ny_sf, ny_fs, ny_ff, ny_ffs, ny_fff]
   */
  private translateViscosityToV3(v: number[]): number[] {
    if (!v || v.length < 3) return v;
    // If all zeros, use v3 defaults
    if (v[0] === 0 && v[1] === 0 && v[2] === 0) {
      return [-9999, -9999, -3.0, -9999, -3.0, 0.0];
    }
    return [v[0], v[0], v[1], v[1], v[2], 0.0];
  }

  /**
   * Build v3 controls[11] from web-app scalar control params.
   * v3 order: corrheight, diffcontrol, curvature, surface, entrainment,
   *           stopping, dynfric, nonhydro, separation, hydmanage, deceleration
   */
  private buildV3Controls(p: any): number[] {
    return [
      0,                              // [0] corrheight
      0,                              // [1] diffcontrol
      1,                              // [2] curvature (always 1)
      p.csurface || 0,                // [3] surface
      p.centrainment ? 1 : 0,         // [4] entrainment
      p.cstopping || 0,               // [5] stopping
      0,                              // [6] dynfric (disabled by default)
      0,                              // [7] nonhydro
      0,                              // [8] separation
      2,                              // [9] hydmanage (default 2)
      0,                              // [10] deceleration
    ];
  }

  /**
   * Build v3 special[33] for model=7 from web-app drag/virtualmass params.
   */
  private buildV3Special(p: any): number[] {
    const vm = p.virtualmass || [10, 0.12, 1];
    const dr = p.drag || [1, 3, 1, 0.1, 1, 1];
    return [
      0.05,       // [0]  HFLOWMIN
      0.0,        // [1]  reserved
      0.333,      // [2]  solid fraction
      0.0,        // [3]  reserved
      vm[0],      // [4]  virtual mass number
      vm[1],      // [5]  virtual mass coeff
      vm[2],      // [6]  virtual mass exponent
      dr[0],      // [7]  drag K
      dr[2],      // [8]  drag n
      dr[1],      // [9]  drag m
      dr[0],      // [10] drag K repeat
      dr[3],      // [11] drag Ut
      dr[4],      // [12] drag Rep
      dr[5],      // [13] drag j
      1, 1, 1,    // [14-16] scaling factors
      0, 0, 0,    // [17-19] reserved
      1, 1, 1,    // [20-22] scaling factors
      10, 0, 1, 1, 1,  // [23-27] additional params
      0.0,        // [28] threshold
      1.0,        // [29] slidepar-related
      4.0,        // [30] slidepar-related
      1.0,        // [31] slidepar-related
      100.0,      // [32] slidepar-related
    ];
  }

  /**
   * Translate web-app thresholds[5] to v3 thresholds[4].
   * Web-app: [hflow, kinetic, pressure, velocity, computation]
   * v3:      [hflow, kinetic, pressure, computation]
   */
  private translateThresholdsToV3(t: number[]): number[] {
    if (!t || t.length < 5) return t;
    return [t[0], t[1], t[2], t[4]];
  }

  /**
   * Translate web-app visualization[18] to v3 visualization[17].
   * Web-app prepends viz_deform at index 0; v3 does not have it.
   */
  private translateVisualizationToV3(viz: number[]): number[] {
    if (!viz || viz.length < 18) return viz;
    return viz.slice(1);
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

    // 2. Phases: v3 uses string format (s, s,fs,f)
    let phasesStr: string;
    if (typeof p.phases === 'string') {
      phasesStr = p.phases;
    } else {
      phasesStr = p.phases === 1 ? 's' : 's,fs,f';
    }

    // Start building command parts (will be joined with line continuations)
    const parts: string[] = [];

    // Flags + prefix + cellsize + phases (first line)
    parts.push(
      `${this.avaflowModule} ${flags} prefix=${this.sanitizeProjectName(experiment.name)} cellsize=${this.validateNumber(p.cellsize, 'cellsize')} phases=${phasesStr}`,
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

    // 5. Scalar params: gravity, limiter, layers
    if (p.gravity != null) {
      const val = this.validateNumber(p.gravity, 'gravity');
      if (val !== SCALAR_DEFAULTS.gravity) {
        parts.push(`  gravity=${val}`);
      }
    }
    if (p.limiter != null) {
      const val = this.validateNumber(p.limiter, 'limiter');
      if (val !== SCALAR_DEFAULTS.limiter) {
        parts.push(`  limiter=${val}`);
      }
    }
    if (p.clayers != null) {
      const val = this.validateNumber(p.clayers, 'clayers');
      if (val !== SCALAR_DEFAULTS.clayers) {
        parts.push(`  layers=${val}`);
      }
    }

    // cores: only for multiple model runs
    if (p.flag_m && p.cores != null) {
      const val = this.validateNumber(p.cores, 'cores');
      if (val !== SCALAR_DEFAULTS.cores) {
        parts.push(`  cores=${val}`);
      }
    }

    // sampling: only emitted if flag_m is true and value differs from default
    if (p.flag_m && p.sampling != null) {
      const val = this.validateNumber(p.sampling, 'sampling');
      if (val !== SCALAR_DEFAULTS.sampling) {
        parts.push(`  sampling=${val}`);
      }
    }

    // Helper functions
    const emitArray = (name: string, values: number[] | null | undefined) => {
      if (!values || !Array.isArray(values)) return;
      values.forEach((v, i) => this.validateNumber(v, `${name}[${i}]`));
      parts.push(`  ${name}=${values.join(',')}`);
    };

    // 6. density — ALWAYS emit
    emitArray('density', p.density);

    // 7. friction: translate web-app [9] → v3 [7] for 3-phase model
    if (p.friction && Array.isArray(p.friction)) {
      const v3friction = this.translateFrictionToV3(p.friction);
      emitArray('friction', v3friction);
    }

    // 8. viscosity: translate web-app [3] → v3 [6] for 3-phase model
    if (p.viscosity && Array.isArray(p.viscosity)) {
      const v3visc = this.translateViscosityToV3(p.viscosity);
      emitArray('viscosity', v3visc);
    }

    // 9. basal: web-app stores as 'entrainment' array, v3 param name is 'basal'
    if (p.entrainment && Array.isArray(p.entrainment)) {
      emitArray('basal', p.entrainment);
    }

    // 10. transformation
    if (p.transformation && Array.isArray(p.transformation)) {
      emitArray('transformation', p.transformation);
    }

    // 11. controls: build v3 controls[11] from web-app scalar params
    const v3controls = this.buildV3Controls(p);
    parts.push(`  controls=${v3controls.join(',')}`);

    // 12. special: build v3 special[33] from web-app drag/virtualmass
    const v3special = this.buildV3Special(p);
    parts.push(`  special=${v3special.join(',')}`);

    // 13. dynfric: v3 default for model=7
    parts.push(`  dynfric=0.0,-6.0,0.0`);

    // 14. slidepar: web-app [6] → v3 [3] (first 3 values)
    if (p.slidepar && Array.isArray(p.slidepar)) {
      const v3slidepar = p.slidepar.slice(0, 3);
      emitArray('slidepar', v3slidepar);
    }

    // 15. thresholds: web-app [5] → v3 [4] (remove velocity threshold at index 3)
    if (p.thresholds && Array.isArray(p.thresholds)) {
      const v3thresholds = this.translateThresholdsToV3(p.thresholds);
      emitArray('thresholds', v3thresholds);
    }

    // 16. cfl
    if (p.cfl && Array.isArray(p.cfl)) {
      emitArray('cfl', p.cfl);
    }

    // 17. slomo: web-app [3] → v3 scalar (first element)
    if (p.slomo && Array.isArray(p.slomo)) {
      const val = this.validateNumber(p.slomo[0], 'slomo');
      if (val !== 1) {
        parts.push(`  slomo=${val}`);
      }
    }

    // 18. Special parameters
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

    // 19. Text parameters
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

    // 20. Visualization: web-app [18] → v3 [17] (remove deform at index 0)
    if (p.visualizationExplicit && p.visualization && Array.isArray(p.visualization)) {
      const v3viz = this.translateVisualizationToV3(p.visualization);
      parts.push(`  visualization=${v3viz.join(',')}`);
    }

    // 21. time — ALWAYS LAST
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

    const projectPath = path.join(this.projectsRoot, safeName);

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

  runSimulation(projectName: string): { success: boolean; message: string } {
    if (this.runningProcess) {
      return { success: false, message: 'A simulation is already running' };
    }

    const safeName = this.sanitizeProjectName(projectName);
    const projectPath = path.join(this.projectsRoot, safeName);
    const shellCmd = `cd ${projectPath} && bash ${safeName}.sh`;

    const child = spawn('grass', [
      '--tmp-project', 'XY', '--exec',
      'bash', '-c', shellCmd,
    ]);

    this.runningProcess = child;

    const statsInterval = setInterval(() => {
      const stats = this.getSimulationStats();
      this.appGateway.server.emit('simulationStats', stats);
    }, 5000);

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
      clearInterval(statsInterval);
      this.runningProcess = null;
      this.appGateway.server.emit('simulationDone', {
        projectName: safeName,
        exitCode: exitCode ?? 1,
        success: exitCode === 0,
      });
    });

    child.on('error', (err: Error) => {
      clearInterval(statsInterval);
      this.runningProcess = null;
      emitLine(`Error spawning GRASS: ${err.message}`);
      this.appGateway.server.emit('simulationDone', {
        projectName: safeName,
        exitCode: 1,
        success: false,
      });
    });

    return { success: true, message: `Simulation started for project: ${safeName}` };
  }

  stopSimulation(): { success: boolean; message: string } {
    if (!this.runningProcess) {
      return { success: false, message: 'No simulation is currently running' };
    }

    this.runningProcess.kill();
    this.runningProcess = null;
    return { success: true, message: 'Simulation stop signal sent' };
  }

  async updateCpuLimit(cpus: number): Promise<{ success: boolean; cpus: number }> {
    const containerName = process.env.HOSTNAME || 'self';
    const nanoCpus = cpus * 1e9;
    const data = JSON.stringify({ NanoCpus: nanoCpus });

    return new Promise((resolve) => {
      const options: http.RequestOptions = {
        socketPath: '/var/run/docker.sock',
        path: `/v1.47/containers/${containerName}/update`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const req = http.request(options, (res) => {
        resolve({ success: res.statusCode === 200, cpus });
      });
      req.on('error', () => resolve({ success: false, cpus: 0 }));
      req.write(data);
      req.end();
    });
  }

  getSimulationStats(): { cpuPercent: number; memoryMB: number; pid: number | null } {
    if (!this.runningProcess) {
      return { cpuPercent: 0, memoryMB: 0, pid: null };
    }

    try {
      const result = execSync(
        `ps aux | grep r.avaflow.main | grep -v grep | head -1`,
        { timeout: 3000 },
      );
      const line = result.toString().trim();
      if (!line) {
        return { cpuPercent: 0, memoryMB: 0, pid: this.runningProcess.pid };
      }
      const parts = line.split(/\s+/);
      return {
        cpuPercent: parseFloat(parts[2]) || 0,
        memoryMB: Math.round((parseInt(parts[5]) || 0) / 1024),
        pid: parseInt(parts[1]) || this.runningProcess.pid,
      };
    } catch {
      return { cpuPercent: 0, memoryMB: 0, pid: this.runningProcess?.pid || null };
    }
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

  private getResultFileType(filename: string): ResultFile['type'] {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.gif') return 'animation';
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return 'image';
    if (ext === '.asc' || ext === '.tif' || ext === '.tiff') return 'raster';
    return 'data';
  }

  async listResultFiles(projectName: string): Promise<ResultFile[]> {
    const safeName = this.sanitizeProjectName(projectName);
    const projectPath = path.join(this.projectsRoot, safeName);

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project "${safeName}" not found`);
    }

    const resultExtensions = ['.gif', '.png', '.jpg', '.jpeg', '.txt', '.csv', '.asc', '.tif', '.tiff'];
    const isResultFile = (f: string) =>
      resultExtensions.includes(path.extname(f).toLowerCase());

    const results: ResultFile[] = [];

    const entries = await fsPromises.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith('_results')) continue;

      const resultsDir = path.join(projectPath, entry.name);
      await this.scanDirRecursive(resultsDir, projectPath, isResultFile, results);
    }

    return results;
  }

  private async scanDirRecursive(
    dir: string,
    projectRoot: string,
    filter: (name: string) => boolean,
    results: ResultFile[],
  ): Promise<void> {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.scanDirRecursive(fullPath, projectRoot, filter, results);
      } else if (entry.isFile() && filter(entry.name)) {
        const stat = await fsPromises.stat(fullPath);
        results.push({
          name: entry.name,
          path: path.relative(projectRoot, fullPath).replace(/\\/g, '/'),
          type: this.getResultFileType(entry.name),
          size: stat.size,
        });
      }
    }
  }

  getResultFilePath(projectName: string, filePath: string): string {
    const safeName = this.sanitizeProjectName(projectName);
    const safeFilePath = this.sanitizeFilename(filePath);
    const fullPath = path.join(this.projectsRoot, safeName, safeFilePath);

    // Prevent directory traversal
    const projectRoot = path.join(this.projectsRoot, safeName);
    if (!fullPath.startsWith(projectRoot)) {
      throw new Error('Invalid file path');
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${safeFilePath}`);
    }

    return fullPath;
  }

  getProjectPath(projectName: string): string {
    const safeName = this.sanitizeProjectName(projectName);
    const projectPath = path.join(this.projectsRoot, safeName);
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project "${safeName}" not found`);
    }
    return projectPath;
  }
}
