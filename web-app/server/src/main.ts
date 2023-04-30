import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as socketIo from 'socket.io';
import { AppGateway } from './app.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);

  const io = new socketIo.Server(app.getHttpServer(), {
    cors: {
      origin: '*',
    },
  });

  app.get(AppGateway).initialize(io);
}
bootstrap();
