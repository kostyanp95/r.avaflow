// ──────────────────────────────────────────────
// Simulation wizard interfaces (5-step wizard)
// ──────────────────────────────────────────────

/** Step 1: Project setup */
export interface ProjectConfig {
  name: string;       // project folder name
  prefix: string;     // output prefix (alphanumeric + underscore)
  cellsize: number;   // metres, min 1
  phases: 's,fs,f';   // fixed three-phase for now
}

/** Step 2: Raster inputs */
export interface RasterConfig {
  elevation: string;    // filename, required
  hrelease1?: string;
  hrelease2?: string;
  hrelease3?: string;
  hentrmax1?: string;
  hentrmax2?: string;
  hentrmax3?: string;
  impactarea?: string;
}

/** Step 3: Material parameters */
export interface MaterialConfig {
  density: [number, number, number];    // kg/m3 for P1, P2, P3
  friction: (number | null)[];          // 9 friction values (null = not set)
  cohesion: [number, number, number];   // N/m2 for P1, P2, P3
  viscosity: (number | null)[];         // log10(m2/s) for P1, P2, P3 (null = not set)
}

/** Step 4: Advanced / timing */
export interface AdvancedConfig {
  tint: number;         // output interval, seconds
  tend: number;         // end time, seconds
  entrainment?: number;
  stopping?: number;
}

/** Full simulation configuration (steps 1-4) */
export interface SimulationConfig {
  project: ProjectConfig;
  rasters: RasterConfig;
  materials: MaterialConfig;
  advanced: AdvancedConfig;
}

/** Sensible defaults for a quick 3-phase test run */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  project: {
    name: '',
    prefix: 'sim',
    cellsize: 20,
    phases: 's,fs,f',
  },
  rasters: {
    elevation: '',
  },
  materials: {
    density: [2600, 1300, 1000],
    friction: [35, 20, 0, 20, 10, 0, 3, 3, 0],
    cohesion: [0, 0, 0],
    viscosity: [0, 0, 0],
  },
  advanced: {
    tint: 10,
    tend: 120,
  },
};

// ──────────────────────────────────────────────
// Legacy interfaces (still used by existing code)
// ──────────────────────────────────────────────

export interface ExperimentFormItem {
  name: string;
  shortName?: string;
  type: ExperimentFormItemType;
  value?: string | number | boolean;
  fields?: Array<ExperimentFormItem>;
  labels?: Array<ExperimentFormRadio>;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
}

export interface ExperimentFormRadio extends ExperimentFormItem {
  type: 'radio';
  value: MaterialOfPhase;
}

export type ExperimentFormItemType = 'file' | 'number' | 'text' | 'checkbox' | 'radio' | 'group';

export interface ExperimentFormGroup extends ExperimentFormItem {
  type: 'group';
  fields: Array<ExperimentFormItem>;
}

export type MaterialOfPhase = 's' | 'fs' | 'f';

export interface RasterFromServer {
  name: string;
  path?: string;
  values?: Array<string>;
}

export interface RastersFromServer {
  filesUploaded: Array<RasterFromServer>;
}

export interface Project {
  name: string;
  experiments: Array<Experiment>;
}

export interface Experiment {
  name: string;
  parameters: any;
}
