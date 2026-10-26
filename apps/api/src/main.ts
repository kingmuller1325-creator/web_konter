import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as compression from 'compression';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global response envelope and error shape (consistent for all clients)
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
  });

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable for API
  }));

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Konteros Retail API')
    .setDescription('API untuk Aplikasi Retail Konter Pulsa & Multi-Layanan')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autentikasi dan otorisasi')
    .addTag('Products', 'Manajemen produk dan kategori')
    .addTag('Inventory', 'Manajemen stok dan pergerakan')
    .addTag('Customers', 'Manajemen pelanggan')
    .addTag('Transactions', 'Transaksi POS')
    .addTag('Shifts', 'Manajemen shift kasir')
    .addTag('Reports', 'Laporan penjualan dan stok')
    .addTag('Sync', 'Sinkronisasi offline')
    .addTag('Settings', 'Pengaturan outlet')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const host = configService.get<string>('HOST') || '0.0.0.0';

  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`🚀 Server running on http://${host}:${port}`);
  logger.log(`📚 API Docs: http://${host}:${port}/docs`);
}

bootstrap();