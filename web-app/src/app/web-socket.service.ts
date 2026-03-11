import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
 socket$: Socket = io(APP_CONFIG.apiUrl);

  webSocketConnect(): Observable<any> {
    return new Observable((observer) => {
      this.socket$.on('filesUploaded', (data) => {
        observer.next(data);
      });
    });
  }

  onSimulationLog(): Observable<{ line: string; timestamp: number }> {
    return new Observable(observer => {
      this.socket$.on('simulationLog', (data) => observer.next(data));
    });
  }

  onSimulationDone(): Observable<{ projectName: string; exitCode: number; success: boolean }> {
    return new Observable(observer => {
      this.socket$.on('simulationDone', (data) => observer.next(data));
    });
  }
}
