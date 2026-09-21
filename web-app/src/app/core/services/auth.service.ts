import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, switchMap, shareReplay } from 'rxjs';
import { APP_CONFIG } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  admin: boolean;
}

export interface AuthConfigDto {
  enabled: boolean;
  botUsername: string | null;
}

/**
 * Telegram-bot authorization client.
 * Sessions live in an httpOnly cookie set by the server, so this service
 * only needs to know WHO is logged in (GET /auth/me) and to exchange
 * one-time bot tokens (POST /auth/tg/exchange).
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user: AuthUser | null = null;

  private config?: AuthConfigDto;
  private config$?: Observable<AuthConfigDto>;
  private ready$?: Observable<boolean>;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<AuthConfigDto> {
    if (!this.config$) {
      this.config$ = this.http
        .get<AuthConfigDto>(`${APP_CONFIG.apiUrl}/auth/config`)
        .pipe(
          catchError(() => of<AuthConfigDto>({ enabled: false, botUsername: null })),
          map(config => {
            this.config = config;
            return config;
          }),
          shareReplay(1)
        );
    }
    return this.config$;
  }

  get authEnabled(): boolean {
    return this.config?.enabled ?? false;
  }

  get isAdmin(): boolean {
    return this.user?.admin ?? false;
  }

  /** Resolves true when the user may enter the app. */
  ensureReady(): Observable<boolean> {
    if (!this.ready$) {
      this.ready$ = this.loadConfig().pipe(
        switchMap(config => {
          if (!config.enabled) {
            this.user = null;
            return of(true);
          }
          return this.http
            .get<{ user: AuthUser | null }>(`${APP_CONFIG.apiUrl}/auth/me`)
            .pipe(
              map(res => {
                this.user = res.user;
                return res.user != null;
              }),
              catchError(() => {
                this.user = null;
                return of(false);
              })
            );
        }),
        shareReplay(1)
      );
    }
    return this.ready$;
  }

  /** Drop the cached session state (after login/logout/401). */
  invalidateSession(): void {
    this.user = null;
    this.ready$ = undefined;
  }

  exchangeToken(token: string): Observable<AuthUser> {
    return this.http
      .post<{ user: AuthUser }>(`${APP_CONFIG.apiUrl}/auth/tg/exchange`, { token })
      .pipe(
        map(res => {
          this.user = res.user;
          this.ready$ = undefined;
          return res.user;
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post(`${APP_CONFIG.apiUrl}/auth/logout`, {}).pipe(
      map(() => {
        this.user = null;
        this.ready$ = undefined;
      })
    );
  }
}
