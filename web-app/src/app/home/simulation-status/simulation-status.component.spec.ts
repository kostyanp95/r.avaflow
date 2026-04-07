import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { TranslateModule } from '@ngx-translate/core';

import { SimulationStatusComponent } from './simulation-status.component';
import { WebSocketService } from '../../web-socket.service';
import { APP_CONFIG } from '../../../environments/environment';

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  private logSubject = new Subject<{ line: string; timestamp: number }>();
  private doneSubject = new Subject<{ projectName: string; exitCode: number; success: boolean }>();

  onSimulationLog() { return this.logSubject.asObservable(); }
  onSimulationDone() { return this.doneSubject.asObservable(); }
  webSocketConnect() { return new Subject(); }

  emitLog(line: string) { this.logSubject.next({ line, timestamp: Date.now() }); }
  emitDone(success: boolean, exitCode = 0) { this.doneSubject.next({ projectName: 'test', exitCode, success }); }
}

describe('SimulationStatusComponent', () => {
  let component: SimulationStatusComponent;
  let fixture: ComponentFixture<SimulationStatusComponent>;
  let mockWs: MockWebSocketService;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    mockWs = new MockWebSocketService();

    TestBed.configureTestingModule({
      declarations: [SimulationStatusComponent],
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        NzBadgeModule,
        NzButtonModule,
        NzProgressModule,
        NzIconModule,
        NzMessageModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: WebSocketService, useValue: mockWs }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimulationStatusComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }));

  afterEach(() => {
    // Flush ng-zorro icon SVG requests that are irrelevant to unit tests
    httpMock.match(req => req.url.endsWith('.svg')).forEach(req => req.flush('<svg></svg>'));
    httpMock.verify();
  });

  it('should create with idle status', () => {
    expect(component).toBeTruthy();
    expect(component.status).toBe('idle');
  });

  describe('status transitions on WebSocket events', () => {
    it('should transition to running on log event', () => {
      mockWs.emitLog('Starting simulation...');
      expect(component.status).toBe('running');
    });

    it('should transition to done on successful done event', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(true);
      expect(component.status).toBe('done');
    });

    it('should transition to error on failed done event', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(false, 1);
      expect(component.status).toBe('error');
    });

    it('should transition to error when success is true but exitCode is non-zero', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(true, 1);
      expect(component.status).toBe('error');
    });

    it('should not revert to running when log arrives after done', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(true);
      mockWs.emitLog('Late log line');
      expect(component.status).toBe('done');
    });

    it('should not revert to running when log arrives after error', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(false, 1);
      mockWs.emitLog('Late log line');
      expect(component.status).toBe('error');
    });
  });

  describe('log lines', () => {
    it('should accumulate log lines', () => {
      mockWs.emitLog('line 1');
      mockWs.emitLog('line 2');
      mockWs.emitLog('line 3');
      expect(component.logLines.length).toBe(3);
      expect(component.logLines[0]).toBe('line 1');
      expect(component.logLines[2]).toBe('line 3');
    });
  });

  describe('clearLog', () => {
    it('should empty the log lines array', () => {
      mockWs.emitLog('line 1');
      mockWs.emitLog('line 2');
      component.clearLog();
      expect(component.logLines.length).toBe(0);
    });
  });

  describe('badgeStatus mapping', () => {
    it('should return default for idle', () => {
      component.status = 'idle';
      expect(component.badgeStatus).toBe('default');
    });

    it('should return processing for running', () => {
      component.status = 'running';
      expect(component.badgeStatus).toBe('processing');
    });

    it('should return success for done', () => {
      component.status = 'done';
      expect(component.badgeStatus).toBe('success');
    });

    it('should return error for error', () => {
      component.status = 'error';
      expect(component.badgeStatus).toBe('error');
    });
  });

  describe('statusText mapping', () => {
    it('should return Idle for idle', () => {
      component.status = 'idle';
      expect(component.statusText).toBe('Idle');
    });

    it('should return Running... for running', () => {
      component.status = 'running';
      expect(component.statusText).toBe('Running...');
    });

    it('should return Done for done', () => {
      component.status = 'done';
      expect(component.statusText).toBe('Done');
    });

    it('should return Error for error', () => {
      component.status = 'error';
      expect(component.statusText).toBe('Error');
    });
  });

  describe('progress', () => {
    it('should start as null', () => {
      expect(component.progress).toBeNull();
    });

    it('should be set to 0 when first log arrives', () => {
      mockWs.emitLog('Starting...');
      expect(component.progress).toBe(0);
    });

    it('should parse progress from time pattern', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitLog('t = 60.00 s (of 120.00 s)');
      expect(component.progress).toBe(50);
    });

    it('should parse progress from percentage pattern', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitLog('Progress: 75%');
      expect(component.progress).toBe(75);
    });

    it('should reset to null on done', () => {
      mockWs.emitLog('Starting...');
      mockWs.emitDone(true);
      expect(component.progress).toBeNull();
    });
  });

  describe('isRunning', () => {
    it('should return true when status is running', () => {
      component.status = 'running';
      expect(component.isRunning).toBeTrue();
    });

    it('should return false when status is idle', () => {
      component.status = 'idle';
      expect(component.isRunning).toBeFalse();
    });
  });

  describe('runSimulation', () => {
    it('should POST to /run with projectName', () => {
      component.projectName = 'testProject';
      component.runSimulation();

      const req = httpMock.expectOne(`${APP_CONFIG.apiUrl}/run`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ projectName: 'testProject' });
      req.flush({ success: true, message: 'ok' });
    });

    it('should not POST when projectName is empty', () => {
      component.projectName = '';
      component.runSimulation();
      httpMock.expectNone(`${APP_CONFIG.apiUrl}/run`);
    });

    it('should not POST when simulation is already running', () => {
      component.projectName = 'testProject';
      component.status = 'running';
      component.runSimulation();
      httpMock.expectNone(`${APP_CONFIG.apiUrl}/run`);
    });
  });

  describe('Run button in template', () => {
    it('should be disabled when projectName is empty', () => {
      component.projectName = '';
      fixture.detectChanges();
      const runButton = fixture.nativeElement.querySelector('.btn-run') as HTMLButtonElement;
      expect(runButton).toBeTruthy();
      expect(runButton.disabled).toBeTrue();
    });

    it('should be disabled when simulation is running', () => {
      component.projectName = 'testProject';
      component.status = 'running';
      fixture.detectChanges();
      const runButton = fixture.nativeElement.querySelector('.btn-run') as HTMLButtonElement;
      expect(runButton.disabled).toBeTrue();
    });

    it('should be enabled when projectName is set and not running', () => {
      component.projectName = 'testProject';
      component.status = 'idle';
      fixture.detectChanges();
      const runButton = fixture.nativeElement.querySelector('.btn-run') as HTMLButtonElement;
      expect(runButton.disabled).toBeFalse();
    });
  });
});
