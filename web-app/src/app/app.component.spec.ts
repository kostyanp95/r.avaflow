import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { ElectronService } from './core/services';
import { WebSocketService } from './web-socket.service';
import { ThemeService } from './core/services/theme.service';
import { Subject } from 'rxjs';

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  webSocketConnect() { return { subscribe: () => {} }; }
}

class MockThemeService {
  isDark = false;
  currentTheme = 'light' as const;
  theme$ = new Subject();
  toggleTheme() {}
  setTheme(_theme: string) {}
}

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        ElectronService,
        { provide: WebSocketService, useClass: MockWebSocketService },
        { provide: ThemeService, useClass: MockThemeService }
      ],
      imports: [RouterTestingModule, TranslateModule.forRoot()]
    }).compileComponents();
  }));

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
