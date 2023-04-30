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
}
