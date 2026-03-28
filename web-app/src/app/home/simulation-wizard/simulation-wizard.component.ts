import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { WebSocketService } from '../../web-socket.service';
import { SimulationConfig, DEFAULT_SIMULATION_CONFIG, RastersFromServer } from '../models/models';
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
    'wizard.steps.rasterFiles',
    'wizard.steps.materials',
    'wizard.steps.advanced',
    'wizard.steps.reviewRun'
  ];

  phaseLabels = [
    'wizard.materials.p1Solid',
    'wizard.materials.p2FineSolid',
    'wizard.materials.p3Fluid'
  ];

  projectForm: FormGroup;
  rastersForm: FormGroup;
  materialsForm: FormGroup;
  advancedForm: FormGroup;

  private destroy$ = new Subject<void>();
  private filesUploadedHandler: ((data: RastersFromServer) => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private ws: WebSocketService,
    private message: NzMessageService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      prefix: ['sim', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/), Validators.maxLength(20)]],
      cellsize: [20, [Validators.required, Validators.min(1)]]
    });

    this.rastersForm = this.fb.group({
      elevation: ['', Validators.required],
      hrelease1: [null],
      hrelease2: [null],
      hrelease3: [null],
      hentrmax1: [null],
      hentrmax2: [null],
      hentrmax3: [null],
      impactarea: [null]
    }, { validators: SimulationWizardComponent.atLeastOneHrelease });

    this.materialsForm = this.fb.group({
      density0: [2600, [Validators.required, Validators.min(1)]],
      density1: [1300, [Validators.required, Validators.min(1)]],
      density2: [1000, [Validators.required, Validators.min(1)]],
      friction0: [35, [Validators.min(0), Validators.max(90)]],
      friction1: [20, [Validators.min(0), Validators.max(90)]],
      friction2: [0, [Validators.min(0), Validators.max(90)]],
      friction3: [20, [Validators.min(0), Validators.max(90)]],
      friction4: [10, [Validators.min(0), Validators.max(90)]],
      friction5: [0, [Validators.min(0), Validators.max(90)]],
      friction6: [3],
      friction7: [3],
      friction8: [0],
      cohesion0: [0, Validators.min(0)],
      cohesion1: [0, Validators.min(0)],
      cohesion2: [0, Validators.min(0)],
      viscosity0: [0],
      viscosity1: [0],
      viscosity2: [0]
    });

    this.advancedForm = this.fb.group({
      tint: [10, [Validators.required, Validators.min(1)]],
      tend: [120, [Validators.required, Validators.min(1)]],
      entrainment: [null, [Validators.min(0), Validators.max(1)]],
      stopping: [null, Validators.min(0)]
    }, { validators: SimulationWizardComponent.tendGreaterThanTint });
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

  get currentFormGroup(): FormGroup {
    switch (this.currentStep) {
      case 0: return this.projectForm;
      case 1: return this.rastersForm;
      case 2: return this.materialsForm;
      case 3: return this.advancedForm;
      default: return this.projectForm;
    }
  }

  get isCurrentStepValid(): boolean {
    if (this.currentStep === 4) return true;
    return this.currentFormGroup.valid;
  }

  next(): void {
    if (this.currentStep < 4) {
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

  buildConfig(): SimulationConfig {
    const p = this.projectForm.value;
    const r = this.rastersForm.value;
    const m = this.materialsForm.value;
    const a = this.advancedForm.value;

    return {
      project: { name: p.name, prefix: p.prefix, cellsize: p.cellsize, phases: 's,fs,f' },
      rasters: {
        elevation: r.elevation,
        ...(r.hrelease1 && { hrelease1: r.hrelease1 }),
        ...(r.hrelease2 && { hrelease2: r.hrelease2 }),
        ...(r.hrelease3 && { hrelease3: r.hrelease3 }),
        ...(r.hentrmax1 && { hentrmax1: r.hentrmax1 }),
        ...(r.hentrmax2 && { hentrmax2: r.hentrmax2 }),
        ...(r.hentrmax3 && { hentrmax3: r.hentrmax3 }),
        ...(r.impactarea && { impactarea: r.impactarea }),
      },
      materials: {
        density: [m.density0, m.density1, m.density2],
        friction: [m.friction0, m.friction1, m.friction2, m.friction3, m.friction4, m.friction5, m.friction6, m.friction7, m.friction8],
        cohesion: [m.cohesion0, m.cohesion1, m.cohesion2],
        viscosity: [m.viscosity0, m.viscosity1, m.viscosity2],
      },
      advanced: {
        tint: a.tint,
        tend: a.tend,
        ...(a.entrainment != null && { entrainment: a.entrainment }),
        ...(a.stopping != null && { stopping: a.stopping }),
      }
    };
  }

  stripExt(filename: string): string {
    return filename ? filename.replace(/\.tiff?$/i, '') : '';
  }

  generateScriptPreview(config: SimulationConfig): string {
    const lines: string[] = [];
    const elev = this.stripExt(config.rasters.elevation);

    lines.push('g.region -d');
    lines.push(`g.region -s rast=${elev}`);

    // Import all rasters
    const rasterEntries: [string, string | undefined][] = [
      ['elevation', config.rasters.elevation],
      ['hrelease1', config.rasters.hrelease1],
      ['hrelease2', config.rasters.hrelease2],
      ['hrelease3', config.rasters.hrelease3],
      ['hentrmax1', config.rasters.hentrmax1],
      ['hentrmax2', config.rasters.hentrmax2],
      ['hentrmax3', config.rasters.hentrmax3],
      ['impactarea', config.rasters.impactarea],
    ];
    for (const [, val] of rasterEntries) {
      if (val) {
        const name = this.stripExt(val);
        lines.push(`r.in.gdal -o --overwrite input=DATA/${val} output=${name}`);
      }
    }

    // r.avaflow command
    const parts: string[] = [
      `r.avaflow -e -v prefix=${config.project.prefix} cellsize=${config.project.cellsize} phases=s,fs,f \\`,
      `  elevation=${elev} \\`,
    ];

    const optionalRasters: [string, string | undefined][] = [
      ['hrelease1', config.rasters.hrelease1],
      ['hrelease2', config.rasters.hrelease2],
      ['hrelease3', config.rasters.hrelease3],
      ['hentrmax1', config.rasters.hentrmax1],
      ['hentrmax2', config.rasters.hentrmax2],
      ['hentrmax3', config.rasters.hentrmax3],
      ['impactarea', config.rasters.impactarea],
    ];
    for (const [key, val] of optionalRasters) {
      if (val) {
        parts.push(`  ${key}=${this.stripExt(val)} \\`);
      }
    }

    const d = config.materials.density;
    parts.push(`  density=${d[0]},${d[1]},${d[2]} \\`);

    const f = config.materials.friction;
    if (f.some(v => v != null)) {
      parts.push(`  friction=${f.map(v => v ?? 0).join(',')} \\`);
    }

    const visc = config.materials.viscosity;
    if (visc.some(v => v != null)) {
      parts.push(`  viscosity=${visc.map(v => v ?? 0).join(',')} \\`);
    }

    parts.push(`  time=${config.advanced.tint},${config.advanced.tend}`);

    lines.push('');
    lines.push(parts.join('\n'));

    return lines.join('\n');
  }

  saveOnly(): void {
    const config = this.buildConfig();
    const body = this.buildApiPayload(config);
    this.http.post(`${APP_CONFIG.apiUrl}/experiment`, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.message.success('Project saved');
          this.projectSaved.emit(config.project.name);
        },
        error: () => this.message.error('Failed to save project')
      });
  }

  saveAndRun(): void {
    const config = this.buildConfig();
    const body = this.buildApiPayload(config);
    this.http.post(`${APP_CONFIG.apiUrl}/experiment`, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.projectSaved.emit(config.project.name);
          this.http.post(`${APP_CONFIG.apiUrl}/run`, { projectName: config.project.name })
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

  reset(): void {
    const d = DEFAULT_SIMULATION_CONFIG;
    this.currentStep = 0;
    this.availableRasters = [];
    this.projectForm.reset({ name: '', prefix: d.project.prefix, cellsize: d.project.cellsize });
    this.rastersForm.reset();
    this.materialsForm.reset({
      density0: d.materials.density[0], density1: d.materials.density[1], density2: d.materials.density[2],
      friction0: d.materials.friction[0], friction1: d.materials.friction[1], friction2: d.materials.friction[2],
      friction3: d.materials.friction[3], friction4: d.materials.friction[4], friction5: d.materials.friction[5],
      friction6: d.materials.friction[6], friction7: d.materials.friction[7], friction8: d.materials.friction[8],
      cohesion0: 0, cohesion1: 0, cohesion2: 0,
      viscosity0: 0, viscosity1: 0, viscosity2: 0
    });
    this.advancedForm.reset({ tint: d.advanced.tint, tend: d.advanced.tend });
  }

  loadFromProject(project: { name: string; experiments: Array<{ name: string; parameters: any }> }): void {
    if (!project?.experiments?.length) return;
    const p = project.experiments[0].parameters;
    this.currentStep = 0;

    this.projectForm.patchValue({ name: project.name, prefix: project.experiments[0].name, cellsize: p.cellsize ?? 20 });

    this.rastersForm.patchValue({
      elevation: p.elevation || null,
      hrelease1: p.hrelease1 || null, hrelease2: p.hrelease2 || null, hrelease3: p.hrelease3 || null,
      hentrmax1: p.hentrmax1 || null, hentrmax2: p.hentrmax2 || null, hentrmax3: p.hentrmax3 || null,
      impactarea: p.impactarea || null,
    });

    if (p.density) {
      this.materialsForm.patchValue({
        density0: p.density.densityOfP1, density1: p.density.densityOfP2, density2: p.density.densityOfP3,
      });
    }
    if (p.friction) {
      this.materialsForm.patchValue({
        friction0: p.friction.internalFrictionAngleOfP1, friction1: p.friction.internalFrictionAngleOfP2, friction2: p.friction.internalFrictionAngleOfP3,
        friction3: p.friction.basalFrictionAngleOfP1,    friction4: p.friction.basalFrictionAngleOfP2,    friction5: p.friction.basalFrictionAngleOfP3,
        friction6: p.friction.fluidFrictionOfP1,         friction7: p.friction.fluidFrictionOfP2,         friction8: p.friction.fluidFrictionOfP3,
      });
    }
    if (p.cohesion) {
      this.materialsForm.patchValue({ cohesion0: p.cohesion.cohesionOfP1, cohesion1: p.cohesion.cohesionOfP2, cohesion2: p.cohesion.cohesionOfP3 });
    }
    if (p.viscosity) {
      this.materialsForm.patchValue({ viscosity0: p.viscosity.viscosityOfP1, viscosity1: p.viscosity.viscosityOfP2, viscosity2: p.viscosity.viscosityOfP3 });
    }

    this.advancedForm.patchValue({ tint: p.tint ?? 10, tend: p.tend ?? 120 });

    // make uploaded rasters of this project available in dropdowns
    const rasterFields = ['elevation', 'hrelease1', 'hrelease2', 'hrelease3', 'hentrmax1', 'hentrmax2', 'hentrmax3', 'impactarea'];
    rasterFields.forEach(field => {
      const val = p[field];
      if (val && !this.availableRasters.includes(val)) {
        this.availableRasters.push(val);
      }
    });

    // load project files into raster dropdowns
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
        error: () => {} // silently ignore if endpoint not available
      });
  }

  private buildApiPayload(config: SimulationConfig): any {
    return {
      name: config.project.name,
      experiments: [{
        name: config.project.prefix,
        parameters: {
          cellsize: config.project.cellsize,
          phases: 's,fs,f',
          elevation: config.rasters.elevation,
          hrelease1: config.rasters.hrelease1 || null,
          hrelease2: config.rasters.hrelease2 || null,
          hrelease3: config.rasters.hrelease3 || null,
          hentrmax1: config.rasters.hentrmax1 || null,
          hentrmax2: config.rasters.hentrmax2 || null,
          hentrmax3: config.rasters.hentrmax3 || null,
          impactarea: config.rasters.impactarea || null,
          density: {
            densityOfP1: config.materials.density[0],
            densityOfP2: config.materials.density[1],
            densityOfP3: config.materials.density[2]
          },
          friction: {
            internalFrictionAngleOfP1: config.materials.friction[0],
            internalFrictionAngleOfP2: config.materials.friction[1],
            internalFrictionAngleOfP3: config.materials.friction[2],
            basalFrictionAngleOfP1: config.materials.friction[3],
            basalFrictionAngleOfP2: config.materials.friction[4],
            basalFrictionAngleOfP3: config.materials.friction[5],
            fluidFrictionOfP1: config.materials.friction[6],
            fluidFrictionOfP2: config.materials.friction[7],
            fluidFrictionOfP3: config.materials.friction[8]
          },
          cohesion: {
            cohesionOfP1: config.materials.cohesion[0],
            cohesionOfP2: config.materials.cohesion[1],
            cohesionOfP3: config.materials.cohesion[2]
          },
          viscosity: {
            viscosityOfP1: config.materials.viscosity[0],
            viscosityOfP2: config.materials.viscosity[1],
            viscosityOfP3: config.materials.viscosity[2]
          },
          tint: config.advanced.tint,
          tend: config.advanced.tend
        }
      }]
    };
  }

  get allFormsValid(): boolean {
    return this.projectForm.valid && this.rastersForm.valid && this.materialsForm.valid && this.advancedForm.valid;
  }
}
