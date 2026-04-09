import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { WebSocketService } from '../../web-socket.service';
import { DEFAULTS, RastersFromServer } from '../models/models';
import { APP_CONFIG } from '../../../environments/environment';

@Component({
  selector: 'app-simulation-wizard',
  templateUrl: './simulation-wizard.component.html',
  styleUrls: ['./simulation-wizard.component.scss']
})
export class SimulationWizardComponent implements OnInit, OnDestroy {
  @Output() simulationStarted = new EventEmitter<void>();
  @Output() projectSaved = new EventEmitter<string>();

  apiUrl = APP_CONFIG.apiUrl;
  currentStep = 0;
  availableRasters: string[] = [];

  stepKeys = [
    'wizard.steps.projectSetup',
    'wizard.steps.terrainRelease',
    'wizard.steps.materials',
    'wizard.steps.entrainmentStopping',
    'wizard.steps.outputTiming',
    'wizard.steps.visualization',
    'wizard.steps.reviewRun'
  ];

  phaseLabels = [
    'wizard.materials.p1Solid',
    'wizard.materials.p2FineSolid',
    'wizard.materials.p3Fluid'
  ];

  setupForm: FormGroup;
  terrainForm: FormGroup;
  materialsForm: FormGroup;
  entrainmentForm: FormGroup;
  outputForm: FormGroup;
  visualizationForm: FormGroup;

  private destroy$ = new Subject<void>();
  private filesUploadedHandler: ((data: RastersFromServer) => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private ws: WebSocketService,
    private message: NzMessageService
  ) {
    const D = DEFAULTS;

    // Step 0: Project & Simulation Setup
    this.setupForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      prefix: [D.prefix, [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/), Validators.maxLength(20)]],
      cellsize: [D.cellsize, [Validators.required, Validators.min(1)]],
      phases: [D.phases],
      limiter: [D.limiter],
      gravity: [D.gravity, [Validators.required, Validators.min(0.01)]],
      cores: [D.cores, [Validators.required, Validators.min(1)]],
      // Advanced simulation settings (collapsible)
      threshold1: [D.thresholds[0]],
      threshold2: [D.thresholds[1]],
      threshold3: [D.thresholds[2]],
      threshold4: [D.thresholds[3]],
      cfl_number: [D.cfl[0], [Validators.min(0.01), Validators.max(0.5)]],
      cfl_timestep: [D.cfl[1]],
      slomo: [D.slomo],
      flag_m: [false],
      sampling: [100],
      aoi_north: [null],
      aoi_south: [null],
      aoi_west: [null],
      aoi_east: [null],
    });

    // Step 1: Terrain & Release
    this.terrainForm = this.fb.group({
      elevation: ['', Validators.required],
      hrelease1: [null],
      hrelease2: [null],
      hrelease3: [null],
      rhrelease1: [null, [Validators.min(0), Validators.max(1)]],
      vhrelease: [null],
      trelease: [null],
      trelstop: [null],
      vinx1: [null], viny1: [null],
      vinx2: [null], viny2: [null],
      vinx3: [null], viny3: [null],
      hydrograph: [null],
      hydrocoords: [null],
    }, { validators: SimulationWizardComponent.atLeastOneHrelease });

    // Step 2: Materials
    this.materialsForm = this.fb.group({
      density0: [D.density[0], [Validators.required, Validators.min(1)]],
      density1: [D.density[1], [Validators.required, Validators.min(1)]],
      density2: [D.density[2], [Validators.required, Validators.min(1)]],
      friction0: [D.friction[0], [Validators.min(0), Validators.max(90)]],
      friction1: [D.friction[1], [Validators.min(0), Validators.max(90)]],
      friction2: [D.friction[2], [Validators.min(0), Validators.max(90)]],
      friction3: [D.friction[3], [Validators.min(0), Validators.max(90)]],
      friction4: [D.friction[4], [Validators.min(0), Validators.max(90)]],
      friction5: [D.friction[5], [Validators.min(0), Validators.max(90)]],
      friction6: [D.friction[6]],
      friction7: [D.friction[7]],
      friction8: [D.friction[8]],
      cohesion0: [0, Validators.min(0)],
      cohesion1: [0, Validators.min(0)],
      cohesion2: [0, Validators.min(0)],
      viscosity0: [0],
      viscosity1: [0],
      viscosity2: [0],
      clayers: [false],
      // Inter-phase interactions (collapsible, multi-phase only)
      drag0: [D.drag[0]], drag1: [D.drag[1]], drag2: [D.drag[2]],
      drag3: [D.drag[3]], drag4: [D.drag[4]], drag5: [D.drag[5]],
      vm0: [D.virtualmass[0]], vm1: [D.virtualmass[1]], vm2: [D.virtualmass[2]],
      // Block sliding (collapsible)
      slidepar0: [0], slidepar1: [0], slidepar2: [0],
      slidepar3: [0], slidepar4: [0], slidepar5: [0],
      // Spatial parameter map overrides (collapsible)
      phi1: [null], phi2: [null], phi3: [null],
      delta1: [null], delta2: [null], delta3: [null],
      ny1: [null], ny2: [null], ny3: [null],
      tufri: [null], flufri: [null], cvshear: [null], deltab: [null],
      frictiograph: [null],
      tslide: [null],
    });

    // Step 3: Entrainment, Stopping & Phase Transformation
    this.entrainmentForm = this.fb.group({
      centrainment: [false],
      entrainment_coeff: [D.entrainment_coeff, [Validators.max(0)]],
      stopping_threshold: [D.stopping_threshold, [Validators.min(0)]],
      hentrmax1: [null],
      hentrmax2: [null],
      hentrmax3: [null],
      rhentrmax1: [null, [Validators.min(0), Validators.max(1)]],
      vhentrmax: [null],
      centr: [null],
      cstopping: [0],
      tstop: [null],
      // Phase transformation (multi-phase only)
      transformation0: [0], transformation1: [0], transformation2: [0],
      ctrans12: [null], ctrans13: [null], ctrans23: [null],
      transformograph: [null],
    });

    // Step 4: Output & Timing
    this.outputForm = this.fb.group({
      tint: [D.tint, [Validators.required, Validators.min(1)]],
      tend: [D.tend, [Validators.required, Validators.min(1)]],
      flag_k: [false],
      flag_a: [false],
      flag_t: [false],
      flag_v: [true],
      impactarea: [null],
      hdeposit: [null],
      zones: [null],
      profile: [null],
      ctrlpoints: [null],
    }, { validators: SimulationWizardComponent.tendGreaterThanTint });

    // Step 5: Visualization (all optional)
    this.visualizationForm = this.fb.group({
      pbgr: [null], pbgg: [null], pbgb: [null],
      viz_hflowmin: [0.1],
      viz_hflowref: [5.0],
      viz_htsunref: [5.0],
      viz_hcontmin: [1],
      viz_hcontmax: [100],
      viz_hcontint: [2000],
      viz_zcontmin: [100],
      viz_zcontmax: [-11000],
      viz_zcontint: [9000],
      viz_pred: [100],
      viz_pgreen: [0.60],
      viz_pblue: [0.25],
      viz_pexp: [0.15],
      viz_phexagg: [0.2],
      viz_pvpath: [1.0],
      viz_rscriptpath: ['Rscript'],
    });
  }

  ngOnInit(): void {
    this.http.get<string[]>(`${APP_CONFIG.apiUrl}/rasters`)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.filesUploadedHandler = (data: RastersFromServer) => {
      data.filesUploaded.forEach(f => {
        if (!this.availableRasters.includes(f.name)) {
          this.availableRasters.push(f.name);
        }
      });
    };
    this.ws.socket$.on('filesUploaded', this.filesUploadedHandler);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.filesUploadedHandler) {
      this.ws.socket$.off('filesUploaded', this.filesUploadedHandler);
    }
  }

  // ── Conditional logic ──

  get isMultiPhase(): boolean {
    return this.setupForm.value.phases === 3;
  }

  get isEntrainmentActive(): boolean {
    return this.entrainmentForm.value.centrainment === true;
  }

  get isStoppingActive(): boolean {
    return this.entrainmentForm.value.cstopping !== 0;
  }

  get isMultipleRuns(): boolean {
    return this.setupForm.value.flag_m === true;
  }

  // ── Validators ──

  static atLeastOneHrelease(group: AbstractControl): ValidationErrors | null {
    const h1 = group.get('hrelease1')?.value;
    const h2 = group.get('hrelease2')?.value;
    const h3 = group.get('hrelease3')?.value;
    return (h1 || h2 || h3) ? null : { noHrelease: true };
  }

  static tendGreaterThanTint(group: AbstractControl): ValidationErrors | null {
    const tint = group.get('tint')?.value;
    const tend = group.get('tend')?.value;
    if (tint != null && tend != null && tend <= tint) {
      return { tendNotGreater: true };
    }
    return null;
  }

  // ── Navigation ──

  get currentFormGroup(): FormGroup {
    switch (this.currentStep) {
      case 0: return this.setupForm;
      case 1: return this.terrainForm;
      case 2: return this.materialsForm;
      case 3: return this.entrainmentForm;
      case 4: return this.outputForm;
      case 5: return this.visualizationForm;
      default: return this.setupForm;
    }
  }

  get isCurrentStepValid(): boolean {
    if (this.currentStep === 5 || this.currentStep === 6) return true;
    return this.currentFormGroup.valid;
  }

  goToStep(step: number): void {
    if (step >= 0 && step <= 6) {
      this.currentStep = step;
    }
  }

  next(): void {
    if (this.currentStep < 6) {
      this.currentStep++;
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  handleUploadChange(info: NzUploadChangeParam): void {
    if (info.file.status === 'done') {
      this.message.success(`${info.file.name} uploaded successfully`);
    } else if (info.file.status === 'error') {
      this.message.error(`${info.file.name} upload failed`);
    }
  }

  // ── Build flat API payload ──

  buildApiPayload(): any {
    const s = this.setupForm.value;
    const t = this.terrainForm.value;
    const m = this.materialsForm.value;
    const e = this.entrainmentForm.value;
    const o = this.outputForm.value;
    const v = this.visualizationForm.value;
    const mp = this.isMultiPhase;

    const params: any = {
      cellsize: s.cellsize,
      phases: s.phases,
      limiter: s.limiter,
      gravity: s.gravity,
      cores: s.cores,
      thresholds: [s.threshold1, s.threshold2, s.threshold3, s.threshold4],
      cfl: [s.cfl_number, s.cfl_timestep],
      slomo: s.slomo,
      time: [o.tint, o.tend],
      elevation: t.elevation,
      hrelease1: t.hrelease1 || null,
      hrelease2: mp ? (t.hrelease2 || null) : null,
      hrelease3: mp ? (t.hrelease3 || null) : null,
      rhrelease1: t.rhrelease1 || null,
      vhrelease: t.vhrelease || null,
      trelease: t.trelease || null,
      trelstop: t.trelstop || null,
      vinx1: t.vinx1 || null, viny1: t.viny1 || null,
      vinx2: mp ? (t.vinx2 || null) : null, viny2: mp ? (t.viny2 || null) : null,
      vinx3: mp ? (t.vinx3 || null) : null, viny3: mp ? (t.viny3 || null) : null,
      hydrograph: t.hydrograph || null,
      hydrocoords: t.hydrocoords || null,
      density: [m.density0, m.density1, m.density2],
      friction: [m.friction0, m.friction1, m.friction2, m.friction3, m.friction4, m.friction5, m.friction6, m.friction7, m.friction8],
      cohesion: [m.cohesion0, m.cohesion1, m.cohesion2],
      viscosity: [m.viscosity0, m.viscosity1, m.viscosity2],
      clayers: m.clayers ? 1 : 0,
      drag: mp ? [m.drag0, m.drag1, m.drag2, m.drag3, m.drag4, m.drag5] : null,
      virtualmass: mp ? [m.vm0, m.vm1, m.vm2] : null,
      slidepar: [m.slidepar0, m.slidepar1, m.slidepar2, m.slidepar3, m.slidepar4, m.slidepar5],
      centrainment: e.centrainment ? 1 : 0,
      cstopping: e.cstopping,
      entrainment: [e.entrainment_coeff, e.stopping_threshold],
      hentrmax1: e.hentrmax1 || null,
      hentrmax2: mp ? (e.hentrmax2 || null) : null,
      hentrmax3: mp ? (e.hentrmax3 || null) : null,
      rhentrmax1: e.rhentrmax1 || null,
      vhentrmax: e.vhentrmax || null,
      centr: e.centr || null,
      tstop: e.tstop || null,
      transformation: mp ? [e.transformation0, e.transformation1, e.transformation2] : null,
      ctrans12: mp ? (e.ctrans12 || null) : null,
      ctrans13: mp ? (e.ctrans13 || null) : null,
      ctrans23: mp ? (e.ctrans23 || null) : null,
      transformograph: mp ? (e.transformograph || null) : null,
      impactarea: o.impactarea || null,
      hdeposit: o.hdeposit || null,
      zones: o.zones || null,
      profile: o.profile || null,
      ctrlpoints: o.ctrlpoints || null,
      flag_m: s.flag_m || false,
      flag_k: o.flag_k || false,
      flag_a: o.flag_a || false,
      flag_t: o.flag_t || false,
      flag_v: o.flag_v !== false,
    };

    // Add sampling only if multiple runs
    if (s.flag_m) {
      params.sampling = s.sampling;
    }

    // Add AOI if set
    if (s.aoi_north != null && s.aoi_south != null && s.aoi_west != null && s.aoi_east != null) {
      params.aoicoords = [s.aoi_north, s.aoi_south, s.aoi_west, s.aoi_east];
    }

    // Spatial parameter map overrides
    const rasterOverrides = [
      'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
      'ny1', 'ny2', 'ny3', 'tufri', 'flufri', 'cvshear', 'deltab', 'tslide'
    ];
    for (const key of rasterOverrides) {
      params[key] = m[key] || null;
    }
    params.frictiograph = m.frictiograph || null;

    // Visualization
    if (v.pbgr) params.pbgr = v.pbgr;
    if (v.pbgg) params.pbgg = v.pbgg;
    if (v.pbgb) params.pbgb = v.pbgb;

    params.visualization = [
      v.viz_hflowmin, v.viz_hflowref, v.viz_htsunref,
      v.viz_hcontmin, v.viz_hcontmax, v.viz_hcontint,
      v.viz_zcontmin, v.viz_zcontmax, v.viz_zcontint,
      v.viz_pred, v.viz_pgreen, v.viz_pblue, v.viz_pexp,
      v.viz_phexagg, v.viz_pvpath
    ];
    params.rscriptpath = v.viz_rscriptpath;

    return {
      name: s.name,
      experiments: [{
        name: s.prefix,
        parameters: params
      }]
    };
  }

  private arrEq(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // ── Strip extension helper ──

  stripExt(filename: string): string {
    return filename ? filename.replace(/\.tiff?$/i, '') : '';
  }

  // ── Generate script preview ──

  generateScriptPreview(): string {
    const payload = this.buildApiPayload();
    const p = payload.experiments[0].parameters;
    const lines: string[] = [];
    const elev = this.stripExt(p.elevation);

    lines.push('g.region -d');

    // Import all rasters
    const allRasters = this.collectRasterFields(p);
    for (const val of allRasters) {
      if (val) {
        const name = this.stripExt(val);
        lines.push(`r.in.gdal -o --overwrite input=DATA/${val} output=${name}`);
      }
    }

    lines.push('');
    lines.push(`g.region -s rast=${elev}`);
    lines.push('');

    // Build r.avaflow command
    const flags: string[] = ['-e'];
    if (p.flag_v !== false) flags.push('-v');
    if (p.flag_k) flags.push('-k');
    if (p.flag_a) flags.push('-a');
    if (p.flag_t) flags.push('-t');

    const parts: string[] = [];
    const phasesStr = p.phases === 1 ? 's' : 's,fs,f';
    parts.push(`r.avaflow ${flags.join(' ')} prefix=${payload.experiments[0].name} cellsize=${p.cellsize} phases=${phasesStr} \\`);
    parts.push(`  elevation=${elev} \\`);

    // Optional rasters
    const rasterParams = [
      'hrelease1', 'hrelease2', 'hrelease3',
      'hentrmax1', 'hentrmax2', 'hentrmax3',
      'impactarea', 'hdeposit', 'zones',
      'trelease', 'trelstop',
      'vinx1', 'viny1', 'vinx2', 'viny2', 'vinx3', 'viny3',
      'centr', 'tstop',
      'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
      'ny1', 'ny2', 'ny3',
      'tufri', 'flufri', 'cvshear', 'deltab', 'tslide',
      'ctrans12', 'ctrans13', 'ctrans23',
      'pbgr', 'pbgg', 'pbgb',
    ];
    for (const key of rasterParams) {
      if (p[key]) {
        parts.push(`  ${key}=${this.stripExt(p[key])} \\`);
      }
    }

    const D = DEFAULTS;

    // Scalars: only emit if non-default
    if (p.limiter !== 1) parts.push(`  limiter=${p.limiter} \\`);
    if (p.gravity !== 9.81) parts.push(`  gravity=${p.gravity} \\`);
    if (p.cores !== 8) parts.push(`  cores=${p.cores} \\`);

    // Arrays: only emit if different from defaults
    if (!this.arrEq(p.density, D.density)) parts.push(`  density=${p.density.join(',')} \\`);
    if (!this.arrEq(p.friction, D.friction)) parts.push(`  friction=${p.friction.join(',')} \\`);
    if (!this.arrEq(p.cohesion, [0, 0, 0])) parts.push(`  cohesion=${p.cohesion.join(',')} \\`);
    if (!this.arrEq(p.viscosity, [0, 0, 0])) parts.push(`  viscosity=${p.viscosity.join(',')} \\`);

    if (p.centrainment !== 0) parts.push(`  centrainment=${p.centrainment} \\`);
    if (p.cstopping !== 0) parts.push(`  cstopping=${p.cstopping} \\`);
    if (p.centrainment !== 0 || p.cstopping !== 0) {
      if (!this.arrEq(p.entrainment, [D.entrainment_coeff, D.stopping_threshold])) {
        parts.push(`  basal=${p.entrainment.join(',')} \\`);
      }
    }

    if (p.clayers !== 0) parts.push(`  clayers=${p.clayers} \\`);

    if (p.drag && this.isMultiPhase && !this.arrEq(p.drag, D.drag)) {
      parts.push(`  drag=${p.drag.join(',')} \\`);
    }
    if (p.virtualmass && this.isMultiPhase && !this.arrEq(p.virtualmass, D.virtualmass)) {
      parts.push(`  virtualmass=${p.virtualmass.join(',')} \\`);
    }

    if (p.slidepar && !this.arrEq(p.slidepar, [0, 0, 0, 0, 0, 0])) {
      parts.push(`  slidepar=${p.slidepar.join(',')} \\`);
    }

    if (p.transformation && this.isMultiPhase && !this.arrEq(p.transformation, [0, 0, 0])) {
      parts.push(`  transformation=${p.transformation.join(',')} \\`);
    }

    if (p.rhrelease1 != null) parts.push(`  rhrelease1=${p.rhrelease1} \\`);
    if (p.vhrelease) parts.push(`  vhrelease=${p.vhrelease} \\`);
    if (p.rhentrmax1 != null) parts.push(`  rhentrmax1=${p.rhentrmax1} \\`);
    if (p.vhentrmax) parts.push(`  vhentrmax=${p.vhentrmax} \\`);
    if (p.hydrograph) parts.push(`  hydrograph=${p.hydrograph} \\`);
    if (p.hydrocoords) parts.push(`  hydrocoords=${p.hydrocoords} \\`);
    if (p.frictiograph) parts.push(`  frictiograph=${p.frictiograph} \\`);
    if (p.transformograph) parts.push(`  transformograph=${p.transformograph} \\`);
    if (p.profile) parts.push(`  profile=${p.profile} \\`);
    if (p.ctrlpoints) parts.push(`  ctrlpoints=${p.ctrlpoints} \\`);

    if (p.thresholds && !this.arrEq(p.thresholds, D.thresholds)) {
      parts.push(`  thresholds=${p.thresholds.join(',')} \\`);
    }
    if (p.cfl && !this.arrEq(p.cfl, D.cfl)) {
      parts.push(`  cfl=${p.cfl.join(',')} \\`);
    }
    if (p.slomo && p.slomo !== '1') {
      parts.push(`  slomo=${p.slomo} \\`);
    }
    if (p.flag_m) parts.push(`  sampling=${p.sampling || 100} \\`);
    if (p.aoicoords) parts.push(`  aoicoords=${p.aoicoords.join(',')} \\`);

    if (p.visualization && !this.arrEq(p.visualization, D.visualization)) {
      parts.push(`  visualization=${p.visualization.join(',')} \\`);
    }

    // Last line: time (no trailing backslash)
    parts.push(`  time=${p.time.join(',')}`);

    lines.push(parts.join('\n'));
    lines.push('');
    lines.push('g.region -d');

    return lines.join('\n');
  }

  private collectRasterFields(p: any): string[] {
    const rasterKeys = [
      'elevation', 'hrelease1', 'hrelease2', 'hrelease3',
      'hentrmax1', 'hentrmax2', 'hentrmax3',
      'impactarea', 'hdeposit', 'zones',
      'trelease', 'trelstop',
      'vinx1', 'viny1', 'vinx2', 'viny2', 'vinx3', 'viny3',
      'centr', 'tstop',
      'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
      'ny1', 'ny2', 'ny3',
      'tufri', 'flufri', 'cvshear', 'deltab', 'tslide',
      'ctrans12', 'ctrans13', 'ctrans23',
      'pbgr', 'pbgg', 'pbgb',
    ];
    return rasterKeys.map(k => p[k]).filter(Boolean);
  }

  // ── Save / Run ──

  saveOnly(): void {
    const body = this.buildApiPayload();
    this.http.post(`${APP_CONFIG.apiUrl}/experiment`, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.message.success('Project saved');
          this.projectSaved.emit(body.name);
        },
        error: () => this.message.error('Failed to save project')
      });
  }

  saveAndRun(): void {
    const body = this.buildApiPayload();
    this.http.post(`${APP_CONFIG.apiUrl}/experiment`, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.projectSaved.emit(body.name);
          this.http.post(`${APP_CONFIG.apiUrl}/run`, { projectName: body.name })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.message.success('Simulation started');
                this.simulationStarted.emit();
              },
              error: () => this.message.error('Failed to start simulation')
            });
        },
        error: () => this.message.error('Failed to save project')
      });
  }

  // ── Reset ──

  reset(): void {
    const D = DEFAULTS;
    this.currentStep = 0;
    this.availableRasters = [];
    this.setupForm.reset({
      name: '', prefix: D.prefix, cellsize: D.cellsize, phases: D.phases,
      limiter: D.limiter, gravity: D.gravity, cores: D.cores,
      threshold1: D.thresholds[0], threshold2: D.thresholds[1], threshold3: D.thresholds[2],
      threshold4: D.thresholds[3],
      cfl_number: D.cfl[0], cfl_timestep: D.cfl[1],
      slomo: D.slomo,
      flag_m: false, sampling: 100,
      aoi_north: null, aoi_south: null, aoi_west: null, aoi_east: null,
    });
    this.terrainForm.reset();
    this.materialsForm.reset({
      density0: D.density[0], density1: D.density[1], density2: D.density[2],
      friction0: D.friction[0], friction1: D.friction[1], friction2: D.friction[2],
      friction3: D.friction[3], friction4: D.friction[4], friction5: D.friction[5],
      friction6: D.friction[6], friction7: D.friction[7], friction8: D.friction[8],
      cohesion0: 0, cohesion1: 0, cohesion2: 0,
      viscosity0: 0, viscosity1: 0, viscosity2: 0,
      clayers: false,
      drag0: D.drag[0], drag1: D.drag[1], drag2: D.drag[2],
      drag3: D.drag[3], drag4: D.drag[4], drag5: D.drag[5],
      vm0: D.virtualmass[0], vm1: D.virtualmass[1], vm2: D.virtualmass[2],
      slidepar0: 0, slidepar1: 0, slidepar2: 0, slidepar3: 0, slidepar4: 0, slidepar5: 0,
    });
    this.entrainmentForm.reset({
      centrainment: false, entrainment_coeff: D.entrainment_coeff, stopping_threshold: D.stopping_threshold,
      cstopping: 0,
      transformation0: 0, transformation1: 0, transformation2: 0,
    });
    this.outputForm.reset({
      tint: D.tint, tend: D.tend,
      flag_k: false, flag_a: false, flag_t: false, flag_v: true,
    });
    this.visualizationForm.reset({
      viz_hflowmin: 0.1, viz_hflowref: 5.0, viz_htsunref: 5.0,
      viz_hcontmin: 1, viz_hcontmax: 100, viz_hcontint: 2000,
      viz_zcontmin: 100, viz_zcontmax: -11000, viz_zcontint: 9000,
      viz_pred: 100, viz_pgreen: 0.60, viz_pblue: 0.25, viz_pexp: 0.15,
      viz_phexagg: 0.2, viz_pvpath: 1.0, viz_rscriptpath: 'Rscript',
    });
  }

  // ── Load from project (supports old nested + new flat format) ──

  loadFromProject(project: { name: string; experiments: Array<{ name: string; parameters: any }> }): void {
    if (!project?.experiments?.length) return;
    const p = project.experiments[0].parameters;
    this.currentStep = 0;

    // Detect old format: density is object not array
    const density = Array.isArray(p.density) ? p.density : (p.density ? [p.density.densityOfP1, p.density.densityOfP2, p.density.densityOfP3] : DEFAULTS.density);
    const friction = Array.isArray(p.friction) ? p.friction : (p.friction ? [
      p.friction.internalFrictionAngleOfP1, p.friction.internalFrictionAngleOfP2, p.friction.internalFrictionAngleOfP3,
      p.friction.basalFrictionAngleOfP1, p.friction.basalFrictionAngleOfP2, p.friction.basalFrictionAngleOfP3,
      p.friction.fluidFrictionOfP1, p.friction.fluidFrictionOfP2, p.friction.fluidFrictionOfP3,
    ] : DEFAULTS.friction);
    const cohesion = Array.isArray(p.cohesion) ? p.cohesion : (p.cohesion ? [p.cohesion.cohesionOfP1, p.cohesion.cohesionOfP2, p.cohesion.cohesionOfP3] : [0, 0, 0]);
    const viscosity = Array.isArray(p.viscosity) ? p.viscosity : (p.viscosity ? [p.viscosity.viscosityOfP1, p.viscosity.viscosityOfP2, p.viscosity.viscosityOfP3] : [0, 0, 0]);

    // Determine phases
    let phases = p.phases ?? 3;
    if (phases === 's,fs,f') phases = 3;
    if (phases === 's' || phases === 'fs' || phases === 'f' || phases === 1) phases = 1;

    // Time params: handle both old (tint/tend) and new (time array) formats
    const tint = Array.isArray(p.time) ? p.time[0] : (p.tint ?? DEFAULTS.tint);
    const tend = Array.isArray(p.time) ? p.time[1] : (p.tend ?? DEFAULTS.tend);

    this.setupForm.patchValue({
      name: project.name,
      prefix: project.experiments[0].name,
      cellsize: p.cellsize ?? DEFAULTS.cellsize,
      phases: phases,
      limiter: p.limiter ?? 1,
      gravity: p.gravity ?? 9.81,
      cores: p.cores ?? 8,
      threshold1: p.thresholds?.[0] ?? DEFAULTS.thresholds[0],
      threshold2: p.thresholds?.[1] ?? DEFAULTS.thresholds[1],
      threshold3: p.thresholds?.[2] ?? DEFAULTS.thresholds[2],
      threshold4: p.thresholds?.[3] ?? DEFAULTS.thresholds[3],
      cfl_number: p.cfl?.[0] ?? DEFAULTS.cfl[0],
      cfl_timestep: p.cfl?.[1] ?? DEFAULTS.cfl[1],
      slomo: p.slomo ?? '1',
      flag_m: p.flag_m ?? false,
      sampling: p.sampling ?? 100,
      aoi_north: p.aoicoords?.[0] ?? null,
      aoi_south: p.aoicoords?.[1] ?? null,
      aoi_west: p.aoicoords?.[2] ?? null,
      aoi_east: p.aoicoords?.[3] ?? null,
    });

    this.terrainForm.patchValue({
      elevation: p.elevation || null,
      hrelease1: p.hrelease1 || null, hrelease2: p.hrelease2 || null, hrelease3: p.hrelease3 || null,
      rhrelease1: p.rhrelease1 ?? null,
      vhrelease: p.vhrelease || null,
      trelease: p.trelease || null, trelstop: p.trelstop || null,
      vinx1: p.vinx1 || null, viny1: p.viny1 || null,
      vinx2: p.vinx2 || null, viny2: p.viny2 || null,
      vinx3: p.vinx3 || null, viny3: p.viny3 || null,
      hydrograph: p.hydrograph || null,
      hydrocoords: p.hydrocoords || null,
    });

    this.materialsForm.patchValue({
      density0: density[0], density1: density[1], density2: density[2],
      friction0: friction[0], friction1: friction[1], friction2: friction[2],
      friction3: friction[3], friction4: friction[4], friction5: friction[5],
      friction6: friction[6], friction7: friction[7], friction8: friction[8],
      cohesion0: cohesion[0], cohesion1: cohesion[1], cohesion2: cohesion[2],
      viscosity0: viscosity[0], viscosity1: viscosity[1], viscosity2: viscosity[2],
      clayers: (p.clayers ?? 0) === 1,
      drag0: p.drag?.[0] ?? DEFAULTS.drag[0], drag1: p.drag?.[1] ?? DEFAULTS.drag[1], drag2: p.drag?.[2] ?? DEFAULTS.drag[2],
      drag3: p.drag?.[3] ?? DEFAULTS.drag[3], drag4: p.drag?.[4] ?? DEFAULTS.drag[4], drag5: p.drag?.[5] ?? DEFAULTS.drag[5],
      vm0: p.virtualmass?.[0] ?? DEFAULTS.virtualmass[0], vm1: p.virtualmass?.[1] ?? DEFAULTS.virtualmass[1], vm2: p.virtualmass?.[2] ?? DEFAULTS.virtualmass[2],
      slidepar0: p.slidepar?.[0] ?? 0, slidepar1: p.slidepar?.[1] ?? 0, slidepar2: p.slidepar?.[2] ?? 0,
      slidepar3: p.slidepar?.[3] ?? 0, slidepar4: p.slidepar?.[4] ?? 0, slidepar5: p.slidepar?.[5] ?? 0,
    });

    // Spatial overrides
    const spatialKeys = ['phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3', 'ny1', 'ny2', 'ny3', 'tufri', 'flufri', 'cvshear', 'deltab', 'frictiograph', 'tslide'];
    const spatialPatch: any = {};
    for (const key of spatialKeys) { spatialPatch[key] = p[key] || null; }
    this.materialsForm.patchValue(spatialPatch);

    this.entrainmentForm.patchValue({
      centrainment: (p.centrainment ?? 0) === 1,
      entrainment_coeff: p.entrainment?.[0] ?? DEFAULTS.entrainment_coeff,
      stopping_threshold: p.entrainment?.[1] ?? 0,
      hentrmax1: p.hentrmax1 || null, hentrmax2: p.hentrmax2 || null, hentrmax3: p.hentrmax3 || null,
      rhentrmax1: p.rhentrmax1 ?? null,
      vhentrmax: p.vhentrmax || null,
      centr: p.centr || null,
      cstopping: p.cstopping ?? 0,
      tstop: p.tstop || null,
      transformation0: p.transformation?.[0] ?? 0, transformation1: p.transformation?.[1] ?? 0, transformation2: p.transformation?.[2] ?? 0,
      ctrans12: p.ctrans12 || null, ctrans13: p.ctrans13 || null, ctrans23: p.ctrans23 || null,
      transformograph: p.transformograph || null,
    });

    this.outputForm.patchValue({
      tint: tint, tend: tend,
      flag_k: p.flag_k ?? false, flag_a: p.flag_a ?? false, flag_t: p.flag_t ?? false, flag_v: p.flag_v !== false,
      impactarea: p.impactarea || null,
      hdeposit: p.hdeposit || null,
      zones: p.zones || null,
      profile: p.profile || null,
      ctrlpoints: p.ctrlpoints || null,
    });

    if (p.visualization) {
      this.visualizationForm.patchValue({
        viz_hflowmin: p.visualization[0] ?? 0.1,
        viz_hflowref: p.visualization[1] ?? 5.0, viz_htsunref: p.visualization[2] ?? 5.0,
        viz_hcontmin: p.visualization[3] ?? 1, viz_hcontmax: p.visualization[4] ?? 100,
        viz_hcontint: p.visualization[5] ?? 2000,
        viz_zcontmin: p.visualization[6] ?? 100, viz_zcontmax: p.visualization[7] ?? -11000,
        viz_zcontint: p.visualization[8] ?? 9000,
        viz_pred: p.visualization[9] ?? 100, viz_pgreen: p.visualization[10] ?? 0.60,
        viz_pblue: p.visualization[11] ?? 0.25, viz_pexp: p.visualization[12] ?? 0.15,
        viz_phexagg: p.visualization[13] ?? 0.2, viz_pvpath: p.visualization[14] ?? 1.0,
      });
    }
    if (p.pbgr) this.visualizationForm.patchValue({ pbgr: p.pbgr });
    if (p.pbgg) this.visualizationForm.patchValue({ pbgg: p.pbgg });
    if (p.pbgb) this.visualizationForm.patchValue({ pbgb: p.pbgb });
    if (p.rscriptpath) this.visualizationForm.patchValue({ viz_rscriptpath: p.rscriptpath });

    // Populate raster dropdowns from loaded project
    const rasterFields = [
      'elevation', 'hrelease1', 'hrelease2', 'hrelease3',
      'hentrmax1', 'hentrmax2', 'hentrmax3',
      'impactarea', 'hdeposit', 'zones',
      'trelease', 'trelstop',
      'vinx1', 'viny1', 'vinx2', 'viny2', 'vinx3', 'viny3',
      'centr', 'tstop',
      'phi1', 'phi2', 'phi3', 'delta1', 'delta2', 'delta3',
      'ny1', 'ny2', 'ny3',
      'tufri', 'flufri', 'cvshear', 'deltab', 'tslide',
      'ctrans12', 'ctrans13', 'ctrans23',
      'pbgr', 'pbgg', 'pbgb',
    ];
    rasterFields.forEach(field => {
      const val = p[field];
      if (val && !this.availableRasters.includes(val)) {
        this.availableRasters.push(val);
      }
    });

    this.http.get<string[]>(`${APP_CONFIG.apiUrl}/project/${project.name}/files`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => {
          files.forEach(f => {
            if (!this.availableRasters.includes(f)) {
              this.availableRasters.push(f);
            }
          });
        },
        error: () => {}
      });
  }

  get allFormsValid(): boolean {
    return this.setupForm.valid && this.terrainForm.valid && this.materialsForm.valid && this.entrainmentForm.valid && this.outputForm.valid;
  }
}
