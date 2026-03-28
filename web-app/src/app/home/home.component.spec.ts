import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync, discardPeriodicTasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA, Component, Input, EventEmitter, Output } from '@angular/core';

import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { TranslateModule } from '@ngx-translate/core';

import { HomeComponent, ProjectSummary, InfoPage } from './home.component';
import { WebSocketService } from '../web-socket.service';
import { ThemeService } from '../core/services/theme.service';
import { APP_CONFIG } from '../../environments/environment';

// Stub child components to isolate HomeComponent
@Component({ selector: 'app-simulation-wizard', template: '' })
class StubSimulationWizardComponent {
  @Output() simulationStarted = new EventEmitter<void>();
  @Output() projectSaved = new EventEmitter<string>();
  reset() {}
  loadFromProject(_data: any) {}
}

@Component({ selector: 'app-simulation-status', template: '' })
class StubSimulationStatusComponent {
  @Input() projectName = '';
}

@Component({ selector: 'app-simulation-results', template: '' })
class StubSimulationResultsComponent {
  @Input() projectName = '';
}

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  onSimulationLog() { return new Subject(); }
  onSimulationDone() { return new Subject(); }
  webSocketConnect() { return new Subject(); }
}

class MockThemeService {
  isDark = false;
  currentTheme = 'light' as const;
  theme$ = new Subject();
  toggleTheme() { this.isDark = !this.isDark; }
  setTheme(_theme: string) {}
}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        HomeComponent,
        StubSimulationWizardComponent,
        StubSimulationStatusComponent,
        StubSimulationResultsComponent
      ],
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        NzMessageModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: WebSocketService, useClass: MockWebSocketService },
        { provide: ThemeService, useClass: MockThemeService },
        NzMessageService
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }));

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`);
    req.flush([]);
    expect(component).toBeTruthy();
  });

  describe('loadProjects', () => {
    it('should populate projects array', () => {
      const mockProjects: ProjectSummary[] = [
        { name: 'proj1', hasJson: true, hasScript: true },
        { name: 'proj2', hasJson: false, hasScript: true }
      ];

      fixture.detectChanges();
      const req = httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`);
      req.flush(mockProjects);

      expect(component.projects.length).toBe(2);
      expect(component.projects[0].name).toBe('proj1');
    });
  });

  describe('openProject', () => {
    it('should load project data', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([]);

      const project: ProjectSummary = { name: 'proj1', hasJson: true, hasScript: true };
      component.openProject(project);

      const req = httpMock.expectOne(`${APP_CONFIG.apiUrl}/project?projectName=proj1`);
      req.flush({ name: 'proj1', experiments: [] });

      expect(component.activeProjectName).toBe('proj1');
      expect(component.selectedTabIndex).toBe(0);
    });

    it('should not load project without JSON', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([]);

      const project: ProjectSummary = { name: 'proj1', hasJson: false, hasScript: true };
      component.openProject(project);

      // No HTTP request should be made for project data
      httpMock.expectNone(`${APP_CONFIG.apiUrl}/project?projectName=proj1`);
    });
  });

  describe('deleteProject', () => {
    it('should remove project and refresh list', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([{ name: 'proj1', hasJson: true, hasScript: true }]);

      const event = new MouseEvent('click');
      component.deleteProject('proj1', event);

      const delReq = httpMock.expectOne(`${APP_CONFIG.apiUrl}/project/proj1`);
      delReq.flush({});

      // After deletion, loadProjects is called again
      const refreshReq = httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`);
      refreshReq.flush([]);

      expect(component.projects.length).toBe(0);
    });
  });

  describe('runProject', () => {
    it('should switch to modeling tab on success', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([]);

      const event = new MouseEvent('click');
      component.runProject('proj1', event);

      const req = httpMock.expectOne(`${APP_CONFIG.apiUrl}/run`);
      expect(req.request.body).toEqual({ projectName: 'proj1' });
      req.flush({});

      expect(component.selectedTabIndex).toBe(1);
    });
  });

  describe('toggleTheme', () => {
    it('should delegate to ThemeService', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([]);

      const themeService = TestBed.inject(ThemeService);
      spyOn(themeService, 'toggleTheme');
      component.toggleTheme();
      expect(themeService.toggleTheme).toHaveBeenCalled();
    });
  });

  describe('info pages', () => {
    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne(`${APP_CONFIG.apiUrl}/projects`).flush([]);
    });

    it('should start with no info page open', () => {
      expect(component.infoPage).toBeNull();
    });

    it('should open about-avaflow info page', () => {
      component.showInfoPage('about-avaflow');
      expect(component.infoPage).toBe('about-avaflow');
    });

    it('should open about-app info page', () => {
      component.showInfoPage('about-app');
      expect(component.infoPage).toBe('about-app');
    });

    it('should open help info page', () => {
      component.showInfoPage('help');
      expect(component.infoPage).toBe('help');
    });

    it('should close info page', () => {
      component.showInfoPage('about-avaflow');
      expect(component.infoPage).toBe('about-avaflow');

      component.closeInfoPage();
      expect(component.infoPage).toBeNull();
    });

    it('should switch between info pages', () => {
      component.showInfoPage('about-avaflow');
      expect(component.infoPage).toBe('about-avaflow');

      component.showInfoPage('help');
      expect(component.infoPage).toBe('help');
    });
  });
});
