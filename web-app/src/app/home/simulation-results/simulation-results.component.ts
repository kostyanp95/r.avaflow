import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { WebSocketService } from '../../web-socket.service';
import { APP_CONFIG } from '../../../environments/environment';

export interface ResultFile {
  filename: string;
  type: string;
}

@Component({
  selector: 'app-simulation-results',
  templateUrl: './simulation-results.component.html',
  styleUrls: ['./simulation-results.component.scss']
})
export class SimulationResultsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() projectName = '';

  files: ResultFile[] = [];
  exitStatus: string | null = null;
  loading = false;
  apiUrl = APP_CONFIG.apiUrl;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private ws: WebSocketService) {}

  ngOnInit(): void {
    this.ws.onSimulationDone()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.exitStatus = data.success ? 'Success' : `Error (exit code: ${data.exitCode})`;
        if (data.projectName === this.projectName) {
          this.loadFiles();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectName'] && this.projectName) {
      this.loadFiles();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFiles(): void {
    if (!this.projectName) return;
    this.loading = true;
    this.http.get<string[]>(`${APP_CONFIG.apiUrl}/project/${this.projectName}/files`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (filenames) => {
          this.files = filenames.map(f => ({
            filename: f,
            type: this.getFileType(f)
          }));
          this.loading = false;
        },
        error: () => {
          this.files = [];
          this.loading = false;
        }
      });
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'tif':
      case 'tiff':
      case 'asc':
        return 'raster';
      case 'csv':
        return 'csv';
      case 'txt':
      case 'log':
        return 'text';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      case 'sh':
        return 'script';
      case 'json':
        return 'json';
      default:
        return 'other';
    }
  }
}
