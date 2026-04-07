import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { WebSocketService } from '../../web-socket.service';
import { APP_CONFIG } from '../../../environments/environment';

@Component({
  selector: 'app-simulation-status',
  templateUrl: './simulation-status.component.html',
  styleUrls: ['./simulation-status.component.scss']
})
export class SimulationStatusComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() projectName = '';

  private readonly MAX_LOG_LINES = 500;
  logLines: string[] = [];
  totalLinesReceived = 0;
  status: 'idle' | 'running' | 'done' | 'error' = 'idle';
  progress: number | null = null;
  apiUrl = APP_CONFIG.apiUrl;

  @ViewChild('logContainer') private logContainer?: ElementRef<HTMLDivElement>;
  private shouldScroll = false;
  private destroy$ = new Subject<void>();

  constructor(private ws: WebSocketService, private http: HttpClient, private message: NzMessageService) {}

  ngOnInit(): void {
    this.ws.onSimulationLog()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (this.status !== 'running' && this.status !== 'done' && this.status !== 'error') {
          this.status = 'running';
          this.progress = 0;
        }
        this.totalLinesReceived++;
        if (!this.shouldFilterLine(data.line)) {
          this.logLines.push(data.line);
          if (this.logLines.length > this.MAX_LOG_LINES) {
            this.logLines = this.logLines.slice(-this.MAX_LOG_LINES);
          }
          this.shouldScroll = true;
        }
        this.parseProgress(data.line);
      });

    this.ws.onSimulationDone()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.status = (data.success && data.exitCode === 0) ? 'done' : 'error';
        this.progress = null;
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.logContainer) {
      const el = this.logContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get badgeStatus(): 'default' | 'processing' | 'success' | 'error' {
    switch (this.status) {
      case 'idle': return 'default';
      case 'running': return 'processing';
      case 'done': return 'success';
      case 'error': return 'error';
    }
  }

  get isRunning(): boolean {
    return this.status === 'running';
  }

  get statusText(): string {
    switch (this.status) {
      case 'idle': return 'Idle';
      case 'running': return 'Running...';
      case 'done': return 'Done';
      case 'error': return 'Error';
    }
  }

  get statusTranslateKey(): string {
    switch (this.status) {
      case 'idle': return 'modeling.idle';
      case 'running': return 'modeling.running';
      case 'done': return 'modeling.done';
      case 'error': return 'modeling.error';
    }
  }

  runSimulation(): void {
    if (!this.projectName || this.isRunning) return;
    this.http.post<{ success: boolean; message: string }>(`${APP_CONFIG.apiUrl}/run`, { projectName: this.projectName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.message.success(`Simulation started: ${this.projectName}`),
        error: () => this.message.error('Failed to start simulation')
      });
  }

  clearLog(): void {
    this.logLines = [];
    this.totalLinesReceived = 0;
  }

  stopSimulation(): void {
    this.http.post(`${APP_CONFIG.apiUrl}/run/stop`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  private static readonly ERROR_PATTERN = /^(Traceback |Error:|FileNotFoundError:|  File ")|FATAL:|CRITICAL:|Exception/;
  private static readonly WARNING_PATTERN = /Warning:|WARNING:/;
  private static readonly PERCENT_ONLY_PATTERN = /^\s*\d{1,3}\s*%\s*$/;
  private static readonly PROJECTION_NOISE = /Over-riding projection check/;

  isErrorLine(line: string): boolean {
    return SimulationStatusComponent.ERROR_PATTERN.test(line);
  }

  isWarningLine(line: string): boolean {
    return SimulationStatusComponent.WARNING_PATTERN.test(line) && !this.isErrorLine(line);
  }

  private shouldFilterLine(line: string): boolean {
    if (SimulationStatusComponent.PROJECTION_NOISE.test(line)) return true;
    if (SimulationStatusComponent.PERCENT_ONLY_PATTERN.test(line) && line.trim() !== '100%') return true;
    return false;
  }

  private parseProgress(line: string): void {
    // r.avaflow outputs: "Computational time step 6916: time = 182.0 s of 2400.0 s"
    const timeMatch = line.match(/time\s*=\s*([\d.]+)\s*s\s+of\s+([\d.]+)\s*s/);
    if (timeMatch) {
      const current = parseFloat(timeMatch[1]);
      const total = parseFloat(timeMatch[2]);
      if (total > 0) {
        this.progress = Math.min(Math.round((current / total) * 100), 100);
      }
    }
  }
}
