import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { SimulationWizardComponent } from './simulation-wizard/simulation-wizard.component';
import { APP_CONFIG } from '../../environments/environment';
import { ThemeService } from '../core/services/theme.service';

export type InfoPage = 'about-avaflow' | 'about-app' | 'help' | null;

export interface ProjectSummary {
  name: string;
  hasJson: boolean;
  hasScript: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isCollapsed = false;
  selectedTabIndex = 0;
  projects: ProjectSummary[] = [];
  activeProjectName = '';
  projectsExpanded = true;
  infoExpanded = false;
  infoPage: InfoPage = null;

  tabLabelKeys = ['tabs.parameters', 'tabs.modeling', 'tabs.results'];
  tabIcons = ['setting', 'experiment', 'bar-chart'];

  @ViewChild(SimulationWizardComponent) wizard?: SimulationWizardComponent;

  currentLang = 'en';

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'en';
  }

  get isDark(): boolean {
    return this.themeService.isDark;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.http.get<ProjectSummary[]>(`${APP_CONFIG.apiUrl}/projects`)
      .subscribe({ next: (p) => this.projects = p, error: () => {} });
  }

  openProject(project: ProjectSummary): void {
    if (!project.hasJson) {
      this.message.warning(`Project "${project.name}" has no JSON config — use Run instead`);
      return;
    }
    this.activeProjectName = project.name;
    this.selectedTabIndex = 0;
    this.http.get<any>(`${APP_CONFIG.apiUrl}/project?projectName=${project.name}`)
      .subscribe({
        next: (data) => {
          if (data && this.wizard) {
            this.wizard.loadFromProject(data);
          }
        },
        error: () => this.message.error('Failed to load project')
      });
  }

  newProject(): void {
    this.activeProjectName = '';
    this.selectedTabIndex = 0;
    if (this.wizard) {
      this.wizard.reset();
    }
  }

  deleteProject(name: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.http.delete(`${APP_CONFIG.apiUrl}/project/${name}`)
      .subscribe({
        next: () => {
          this.message.success(`Project "${name}" deleted`);
          if (this.activeProjectName === name) {
            this.activeProjectName = '';
            this.wizard?.reset();
          }
          this.loadProjects();
        },
        error: () => this.message.error('Failed to delete project')
      });
  }

  runProject(name: string, event: MouseEvent): void {
    event.stopPropagation();
    this.http.post<any>(`${APP_CONFIG.apiUrl}/run`, { projectName: name })
      .subscribe({
        next: () => {
          this.selectedTabIndex = 1;
          this.message.success(`Simulation started: ${name}`);
        },
        error: () => this.message.error('Failed to start simulation')
      });
  }

  onSimulationStarted(): void {
    this.selectedTabIndex = 1;
    this.loadProjects();
  }

  onProjectSaved(name: string): void {
    this.activeProjectName = name;
    this.loadProjects();
  }

  showInfoPage(page: InfoPage): void {
    this.infoPage = page;
  }

  closeInfoPage(): void {
    this.infoPage = null;
  }
}
