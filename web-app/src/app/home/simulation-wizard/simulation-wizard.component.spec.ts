import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { TranslateModule } from '@ngx-translate/core';

import { SimulationWizardComponent } from './simulation-wizard.component';
import { WebSocketService } from '../../web-socket.service';

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  onSimulationLog() { return new Subject(); }
  onSimulationDone() { return new Subject(); }
  webSocketConnect() { return new Subject(); }
}

describe('SimulationWizardComponent', () => {
  let component: SimulationWizardComponent;
  let fixture: ComponentFixture<SimulationWizardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SimulationWizardComponent],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
        NzStepsModule,
        NzFormModule,
        NzInputModule,
        NzInputNumberModule,
        NzSelectModule,
        NzButtonModule,
        NzUploadModule,
        NzDescriptionsModule,
        NzCollapseModule,
        NzTagModule,
        NzTableModule,
        NzToolTipModule,
        NzIconModule,
        NzMessageModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: WebSocketService, useClass: MockWebSocketService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimulationWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.projectForm.value.prefix).toBe('sim');
    expect(component.projectForm.value.cellsize).toBe(20);
    expect(component.currentStep).toBe(0);
  });

  describe('projectForm validation', () => {
    it('should require name', () => {
      component.projectForm.patchValue({ name: '' });
      expect(component.projectForm.get('name')!.valid).toBeFalse();
    });

    it('should accept alphanumeric name', () => {
      component.projectForm.patchValue({ name: 'test_project1' });
      expect(component.projectForm.get('name')!.valid).toBeTrue();
    });

    it('should reject name with special characters', () => {
      component.projectForm.patchValue({ name: 'test project!' });
      expect(component.projectForm.get('name')!.valid).toBeFalse();
    });
  });

  describe('rastersForm validation', () => {
    it('should require at least one hrelease', () => {
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: null, hrelease2: null, hrelease3: null });
      component.rastersForm.markAllAsTouched();
      expect(component.rastersForm.hasError('noHrelease')).toBeTrue();
    });

    it('should pass with hrelease1 set', () => {
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'release.tif' });
      expect(component.rastersForm.hasError('noHrelease')).toBeFalse();
    });
  });

  describe('advancedForm validation', () => {
    it('should fail when tend <= tint', () => {
      component.advancedForm.patchValue({ tint: 100, tend: 50 });
      expect(component.advancedForm.hasError('tendNotGreater')).toBeTrue();
    });

    it('should pass when tend > tint', () => {
      component.advancedForm.patchValue({ tint: 10, tend: 120 });
      expect(component.advancedForm.hasError('tendNotGreater')).toBeFalse();
    });
  });

  describe('buildConfig', () => {
    it('should return correct SimulationConfig structure', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      expect(config.project.name).toBe('test');
      expect(config.project.prefix).toBe('sim');
      expect(config.project.cellsize).toBe(20);
      expect(config.project.phases).toBe('s,fs,f');
      expect(config.rasters.elevation).toBe('dem.tif');
      expect(config.rasters.hrelease1).toBe('hr1.tif');
      expect(config.advanced.tint).toBe(10);
      expect(config.advanced.tend).toBe(120);
      expect(config.materials.density.length).toBe(3);
      expect(config.materials.friction.length).toBe(9);
    });
  });

  describe('generateScriptPreview', () => {
    it('should generate valid bash script', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).toContain('g.region -d');
      expect(script).toContain('r.in.gdal');
      expect(script).toContain('r.avaflow');
      expect(script).toContain('elevation=dem');
      expect(script).toContain('hrelease1=hr1');
      expect(script).toContain('cellsize=20');
      expect(script).toContain('time=10,120');
    });

    it('should include friction when at least one value is set', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).toContain('friction=');
    });

    it('should omit friction when all friction values are null', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.materialsForm.patchValue({
        friction0: null, friction1: null, friction2: null,
        friction3: null, friction4: null, friction5: null,
        friction6: null, friction7: null, friction8: null
      });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).not.toContain('friction=');
    });

    it('should substitute 0 for null friction values when some are set', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.materialsForm.patchValue({
        friction0: 35, friction1: null, friction2: null,
        friction3: null, friction4: null, friction5: null,
        friction6: null, friction7: null, friction8: null
      });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).toContain('friction=35,0,0,0,0,0,0,0,0');
    });

    it('should omit viscosity when all viscosity values are null', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.materialsForm.patchValue({ viscosity0: null, viscosity1: null, viscosity2: null });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).not.toContain('viscosity=');
    });

    it('should include viscosity when at least one value is set', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.materialsForm.patchValue({ viscosity0: 5, viscosity1: null, viscosity2: null });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).toContain('viscosity=5,0,0');
    });

    it('should never include cohesion in the script', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.materialsForm.patchValue({ cohesion0: 100, cohesion1: 200, cohesion2: 300 });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });

      const config = component.buildConfig();
      const script = component.generateScriptPreview(config);
      expect(script).not.toContain('cohesion=');
    });
  });

  describe('stripExt', () => {
    it('should strip .tif extension', () => {
      expect(component.stripExt('file.tif')).toBe('file');
    });

    it('should strip .tiff extension', () => {
      expect(component.stripExt('file.tiff')).toBe('file');
    });

    it('should handle empty string', () => {
      expect(component.stripExt('')).toBe('');
    });
  });

  describe('step navigation', () => {
    it('should move to next step', () => {
      expect(component.currentStep).toBe(0);
      component.next();
      expect(component.currentStep).toBe(1);
    });

    it('should move to previous step', () => {
      component.currentStep = 2;
      component.prev();
      expect(component.currentStep).toBe(1);
    });

    it('should not go below step 0', () => {
      component.currentStep = 0;
      component.prev();
      expect(component.currentStep).toBe(0);
    });

    it('should not go above step 4', () => {
      component.currentStep = 4;
      component.next();
      expect(component.currentStep).toBe(4);
    });

    it('should block next when current step is invalid', () => {
      component.projectForm.patchValue({ name: '' }); // invalid
      expect(component.isCurrentStepValid).toBeFalse();
    });
  });

  describe('allFormsValid', () => {
    it('should be false when projectForm is invalid', () => {
      component.projectForm.patchValue({ name: '' });
      expect(component.allFormsValid).toBeFalse();
    });

    it('should be true when all forms are valid', () => {
      component.projectForm.patchValue({ name: 'test', prefix: 'sim', cellsize: 20 });
      component.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hr1.tif' });
      component.advancedForm.patchValue({ tint: 10, tend: 120 });
      expect(component.allFormsValid).toBeTrue();
    });
  });
});
