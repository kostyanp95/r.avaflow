import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, AuthConfigDto } from '../core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  config?: AuthConfigDto;
  code = '';
  busy = false;
  errorMessage: string | null = null;

  constructor(
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.auth.loadConfig().subscribe(config => {
      this.config = config;
      // Auth disabled (e.g. local dev): nothing to do here.
      if (!config.enabled) {
        this.router.navigate(['/home']);
      }
    });

    if (this.route.snapshot.queryParamMap.get('error')) {
      this.errorMessage = this.translate.instant('login.errorInvalid');
    }
  }

  /** t.me deep link carrying this origin so the bot can link the user back. */
  get botLink(): string {
    const bot = this.config?.botUsername;
    if (!bot) {
      return '';
    }
    const origin = window.location.origin;
    const enc = btoa(origin)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const start = `l_${enc}`;
    // Telegram allows max 64 chars in the start payload.
    return start.length <= 64
      ? `https://t.me/${bot}?start=${start}`
      : `https://t.me/${bot}`;
  }

  submitCode(): void {
    const token = this.code.trim();
    if (!token || this.busy) {
      return;
    }
    this.busy = true;
    this.errorMessage = null;
    this.auth.exchangeToken(token).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => {
        this.busy = false;
        this.errorMessage = this.translate.instant('login.errorInvalid');
      }
    });
  }
}
