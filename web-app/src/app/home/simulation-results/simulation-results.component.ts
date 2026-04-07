import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { WebSocketService } from '../../web-socket.service';
import { APP_CONFIG } from '../../../environments/environment';

export interface ResultFile {
  name: string;
  path: string;
  type: 'animation' | 'image' | 'data';
  size: number;
}

@Component({
  selector: 'app-simulation-results',
  templateUrl: './simulation-results.component.html',
  styleUrls: ['./simulation-results.component.scss']
})
export class SimulationResultsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() projectName = '';

  resultFiles: ResultFile[] = [];
  imageFiles: ResultFile[] = [];
  dataFiles: ResultFile[] = [];
  exitStatus: string | null = null;
  loading = false;
  isDownloading = false;

  // Fullscreen preview
  previewVisible = false;
  previewUrl = '';
  previewFile: ResultFile | null = null;
  zoomLevel = 1;
  currentImageIndex = 0;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private ws: WebSocketService) {}

  ngOnInit(): void {
    this.ws.onSimulationDone()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.exitStatus = (data.success && data.exitCode === 0) ? 'Success' : `Error (exit code: ${data.exitCode})`;
        if (data.projectName === this.projectName) {
          this.loadResults();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectName'] && this.projectName) {
      this.loadResults();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadResults(): void {
    if (!this.projectName) return;
    this.loading = true;
    this.http.get<ResultFile[]>(`${APP_CONFIG.apiUrl}/project/${this.projectName}/results`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => {
          this.resultFiles = files;
          this.imageFiles = files.filter(f => f.type === 'image' || f.type === 'animation');
          this.dataFiles = files.filter(f => f.type === 'data');
          this.loading = false;
        },
        error: () => {
          this.resultFiles = [];
          this.imageFiles = [];
          this.dataFiles = [];
          this.loading = false;
        }
      });
  }

  get totalSize(): number {
    return this.resultFiles.reduce((sum, f) => sum + f.size, 0);
  }

  getFileUrl(file: ResultFile): string {
    return `${APP_CONFIG.apiUrl}/project/${this.projectName}/results/${file.path}`;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  // -- Preview --

  openPreview(file: ResultFile): void {
    this.previewFile = file;
    this.previewUrl = this.getFileUrl(file);
    this.currentImageIndex = this.imageFiles.indexOf(file);
    this.zoomLevel = 1;
    this.previewVisible = true;
  }

  closePreview(): void {
    this.previewVisible = false;
    this.previewFile = null;
    this.zoomLevel = 1;
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 5);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.25);
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  prevImage(): void {
    if (this.imageFiles.length === 0) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.imageFiles.length) % this.imageFiles.length;
    const file = this.imageFiles[this.currentImageIndex];
    this.previewFile = file;
    this.previewUrl = this.getFileUrl(file);
    this.zoomLevel = 1;
  }

  nextImage(): void {
    if (this.imageFiles.length === 0) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.imageFiles.length;
    const file = this.imageFiles[this.currentImageIndex];
    this.previewFile = file;
    this.previewUrl = this.getFileUrl(file);
    this.zoomLevel = 1;
  }

  // -- Download --

  downloadFile(file: ResultFile): void {
    const url = this.getFileUrl(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  }

  downloadAllZip(): void {
    if (!this.projectName) return;
    this.isDownloading = true;
    const url = `${APP_CONFIG.apiUrl}/project/${this.projectName}/results/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.projectName}_results.zip`;
    a.click();
    setTimeout(() => this.isDownloading = false, 3000);
  }
}
