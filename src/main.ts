import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for image uploads (base64)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - allow all origins for now (can be restricted later)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`API endpoint: http://localhost:${port}/api/v1`);
}

bootstrap();
