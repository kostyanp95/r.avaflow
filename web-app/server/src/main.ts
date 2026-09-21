import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as socketIo from 'socket.io';
import { AppGateway } from './app.gateway';
import { AuthService } from './auth/auth.service';
import { authConfig } from './auth/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // origin:true reflects the request origin so dev (localhost:4200) works;
  // credentials:true is required for the session cookie over CORS.
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const io = new socketIo.Server(app.getHttpServer(), {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Authenticate socket.io handshakes with the same session cookie and put
  // each user into a private room so simulation logs never leak across users.
  if (authConfig.enabled) {
    const authService = app.get(AuthService);
    io.use((socket, next) => {
      const user = authService.userFromRequest({
        headers: socket.handshake.headers,
      });
      if (!user) {
        return next(new Error('unauthorized'));
      }
      socket.data = socket.data || {};
      socket.data.user = user;
      next();
    });
    io.on('connection', (socket) => {
      if (socket.data?.user) {
        socket.join(`user:${socket.data.user.id}`);
      }
    });
  }

  app.get(AppGateway).initialize(io);
}
bootstrap();
