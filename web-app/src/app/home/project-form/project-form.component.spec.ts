import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProjectFormComponent } from './project-form.component';
import { WebSocketService } from '../../web-socket.service';

class MockWebSocketService {
  socket$ = { on: jasmine.createSpy('on'), off: jasmine.createSpy('off') };
  webSocketConnect() { return { subscribe: () => {} }; }
}

describe('ProjectFormComponent', () => {
  let component: ProjectFormComponent;
  let fixture: ComponentFixture<ProjectFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectFormComponent],
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: WebSocketService, useClass: MockWebSocketService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectFormComponent);
    component = fixture.componentInstance;
    component.projectName = 'test';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
