import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '@/common/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix('api/v1', { exclude: [''] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('ShopDoAn API')
    .setDescription('API documentation for ShopDoAn')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Menus', 'Menu management endpoints')
    .addTag('Menu Items', 'Menu items and options endpoints')
    .addTag('Reviews', 'Review management endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Chatbot', 'AI chatbot and chat history endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}

bootstrap();

function resolveCorsOrigins() {
  if (process.env.NODE_ENV !== 'production') return true;

  const configuredOrigins =
    process.env.CORS_ORIGINS || process.env.FRONTEND_URL;
  if (!configuredOrigins) return false;

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
