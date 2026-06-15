import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in DTO
      forbidNonWhitelisted: true, // reject requests with extra properties
      transform: true, // transform incoming JSON to DTO class instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('DokoBoard API')
    .setDescription('Project Mangement API - auth, projects, tasks, members')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep the auth token after page refresh
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
