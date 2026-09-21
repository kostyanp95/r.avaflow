import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Landing route for the bot's "Войти в r.avaflow" button:
 * /tg-callback?token=<one-time login token> -> exchange -> /home.
 */
@Component({
  selector: 'app-tg-callback',
  template: `
    <div class="callback-page">
      <div class="callback-spinner"></div>
      <p>{{ 'loginCallback.inProgress' | translate }}</p>
    </div>
  `,
  styles: [
    `
      .callback-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #616e7c;
        font-size: 14px;
      }
      .callback-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(34, 158, 217, 0.2);
        border-top-color: #229ed9;
        border-radius: 50%;
        animation: callback-spin 0.9s linear infinite;
      }
      @keyframes callback-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class TgCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { error: '1' } });
      return;
    }
    this.auth.exchangeToken(token).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.router.navigate(['/login'], { queryParams: { error: '1' } })
    });
  }
}
