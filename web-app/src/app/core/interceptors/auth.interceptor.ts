import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The session cookie is attached automatically (same-origin / withCredentials),
 * so the interceptor only reacts to expired sessions by sending the user to
 * the login page. Auth endpoints themselves are excluded to avoid loops.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (
          err instanceof HttpErrorResponse &&
          err.status === 401 &&
          this.auth.authEnabled &&
          !req.url.includes('/auth/')
        ) {
          this.auth.invalidateSession();
          this.router.navigate(['/login']);
        }
        return throwError(err);
      })
    );
  }
}
