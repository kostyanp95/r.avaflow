import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { SimulationWizardComponent } from './simulation-wizard/simulation-wizard.component';
import { APP_CONFIG } from '../../environments/environment';
import { ThemeService } from '../core/services/theme.service';
import { AuthService } from '../core/services/auth.service';

export type InfoPage = 'about-avaflow' | 'about-app' | 'help' | null;

export interface ProjectSummary {
  name: string;
  hasJson: boolean;
  hasScript: boolean;
  owner?: { id: number; name: string } | null;
}

export interface ProjectGroup {
  key: string;
  /** null for the flat (non-admin / auth-off) single group */
  label: string | null;
  projects: ProjectSummary[];
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
  projectGroups: ProjectGroup[] = [];
  groupExpanded: Record<string, boolean> = {};
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
    private translate: TranslateService,
    public auth: AuthService,
    private router: Router
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
    if (this.projects.length) {
      this.buildGroups();
    }
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.http.get<ProjectSummary[]>(`${APP_CONFIG.apiUrl}/projects`)
      .subscribe({
        next: (p) => {
          this.projects = p;
          this.buildGroups();
        },
        error: () => {}
      });
  }

  /**
   * Admins get collapsible per-user sections ("my" + one per user + legacy
   * unassigned); everyone else sees a single flat list as before.
   */
  private buildGroups(): void {
    const user = this.auth.authEnabled ? this.auth.user : null;
    if (!user || !user.admin) {
      this.projectGroups = [{ key: 'all', label: null, projects: this.projects }];
      return;
    }

    const mine: ProjectSummary[] = [];
    const unassigned: ProjectSummary[] = [];
    const byOwner = new Map<number, { name: string; projects: ProjectSummary[] }>();
    for (const project of this.projects) {
      if (!project.owner) {
        unassigned.push(project);
      } else if (project.owner.id === user.id) {
        mine.push(project);
      } else if (!byOwner.has(project.owner.id)) {
        byOwner.set(project.owner.id, { name: project.owner.name, projects: [project] });
      } else {
        byOwner.get(project.owner.id)!.projects.push(project);
      }
    }

    const groups: ProjectGroup[] = [
      { key: 'mine', label: this.translate.instant('sidebar.myProjects'), projects: mine },
    ];
    for (const entry of [...byOwner.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      groups.push({ key: `user:${entry.name}`, label: entry.name, projects: entry.projects });
    }
    if (unassigned.length > 0) {
      groups.push({
        key: 'unassigned',
        label: this.translate.instant('sidebar.noOwner'),
        projects: unassigned
      });
    }

    // First render: "my" expanded, the rest collapsed.
    if (Object.keys(this.groupExpanded).length === 0) {
      for (const group of groups) {
        this.groupExpanded[group.key] = group.key === 'mine';
      }
    }
    this.projectGroups = groups;
  }

  isGroupExpanded(key: string): boolean {
    return this.groupExpanded[key] !== false;
  }

  toggleGroup(key: string): void {
    this.groupExpanded[key] = !this.isGroupExpanded(key);
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

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  get userInitials(): string {
    const name = (this.auth.user?.displayName || '')
      .replace(/\s*\(@[^)]*\)\s*/, '')
      .trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
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
