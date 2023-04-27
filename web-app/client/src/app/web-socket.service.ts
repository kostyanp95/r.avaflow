import { Injectable } from '@angular/core';
import { filter, Observable } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket$: WebSocketSubject<any>;

  constructor() {
    this.socket$ = webSocket('ws://localhost:3000'); // Change to the correct URL and port
  }

  public on(eventName: string): Observable<any> {
    return this.socket$.asObservable()
      .pipe(
        filter((event => event.type === eventName))
      );
  }
}
