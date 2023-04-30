import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
 socket$: Socket = io('http://localhost:3000');

  webSocketConnect(): Observable<any> {
    return new Observable((observer) => {
      this.socket$.on('filesUploaded', (data) => {
        observer.next(data);
      });
    });
  }
}
