import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'avaflow-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSubject: BehaviorSubject<Theme>;
  readonly theme$: Observable<Theme>;

  constructor() {
    const initial = this.detectInitialTheme();
    this.themeSubject = new BehaviorSubject<Theme>(initial);
    this.theme$ = this.themeSubject.asObservable();
    this.applyTheme(initial);
  }

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  get isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  toggleTheme(): void {
    const next: Theme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    this.themeSubject.next(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }

  private detectInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // localStorage unavailable
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }

  private applyTheme(theme: Theme): void {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }
}
