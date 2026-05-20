import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in DTO
      forbidNonWhitelisted: true, // reject requests with extra properties
      transform: true, // transform incoming JSON to DTO class instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
