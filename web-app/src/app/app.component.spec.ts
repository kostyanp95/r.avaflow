import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { ElectronService } from './core/services';
import { WebSocketService } from './web-socket.service';

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  webSocketConnect() { return { subscribe: () => {} }; }
}

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        ElectronService,
        { provide: WebSocketService, useClass: MockWebSocketService }
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
