import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as socketIo from 'socket.io';
import { AppGateway } from './app.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const io = new socketIo.Server(app.getHttpServer(), {
    cors: {
      origin: '*',
    },
  });

  app.get(AppGateway).initialize(io);
}
bootstrap();
