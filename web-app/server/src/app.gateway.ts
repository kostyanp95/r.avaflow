import { WebSocketGateway } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class AppGateway {
  server: Server;

  initialize(io: Server) {
    this.server = io;
    io.on('connection', (socket) => {
      console.log('Client connected');
    });
  }

  /**
   * Emit to one user's private room, or broadcast when auth is disabled
   * (tgId == null). Rooms `user:<tgId>` are joined in main.ts on connect.
   */
  emitToUser(tgId: number | null, event: string, payload: unknown): void {
    if (tgId != null && this.server) {
      this.server.to(`user:${tgId}`).emit(event, payload);
    } else if (this.server) {
      this.server.emit(event, payload);
    }
  }
}
