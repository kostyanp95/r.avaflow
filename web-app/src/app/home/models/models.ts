// ──────────────────────────────────────────────
// Simulation wizard interfaces (7-step wizard)
// ──────────────────────────────────────────────

/** Default values matching the original r.avaflow form */
export const DEFAULTS = {
  prefix: 'sim',
  cellsize: 20,
  phases: 3,
  limiter: 1,
  gravity: 9.81,
  cores: 8,
  thresholds: [0.1, 10000, 10000, 0.000001] as [number, number, number, number],
  cfl: [0.4, 0.001] as [number, number],
  slomo: '1' as string,
  density: [2700, 1800, 1000] as [number, number, number],
  friction: [35, 20, 0, 20, 0, 0, 0.05, 0, 0] as number[],
  cohesion: [0, 0, 0] as [number, number, number],
  viscosity: [0, 0, 0] as [number, number, number],
  drag: [1, 3, 1, 0.1, 1, 1] as number[],
  virtualmass: [10, 0.12, 1] as [number, number, number],
  slidepar: [0, 0, 0, 0, 0, 0] as number[],
  centrainment: 0,
  cstopping: 0,
  entrainment_coeff: -7.0,
  stopping_threshold: 0.0,
  transformation: [0, 0, 0] as [number, number, number],
  tint: 10,
  tend: 300,
  visualization: [0.1, 5.0, 5.0, 1, 100, 2000, 100, -11000, 9000, 100, 0.60, 0.25, 0.15, 0.2, 1.0] as number[],
  viz_rscriptpath: 'Rscript',
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
  cellsize?: number;
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

// Keep SimulationConfig for backward compatibility (used by buildConfig in old code paths)
export interface SimulationConfig {
  project: { name: string; prefix: string; cellsize: number; phases: string };
  rasters: { elevation: string; [key: string]: string | undefined };
  materials: { density: number[]; friction: (number | null)[]; cohesion: number[]; viscosity: (number | null)[] };
  advanced: { tint: number; tend: number; entrainment?: number; stopping?: number };
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  project: { name: '', prefix: 'sim', cellsize: 20, phases: 's,fs,f' },
  rasters: { elevation: '' },
  materials: {
    density: [2700, 1800, 1000],
    friction: [40, 20, 0, 20, 10, 0, 0, 0, 0.05],
    cohesion: [0, 0, 0],
    viscosity: [0, 0, 0],
  },
  advanced: { tint: 10, tend: 300 },
};
