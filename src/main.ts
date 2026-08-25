import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';

/**
 * Extended Request type that carries the raw request body buffer.
 * Used by webhook controllers for HMAC signature verification.
 */
interface RawBodyRequest extends express.Request {
  rawBody?: Buffer;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Global JSON parser that captures raw body for HMAC signature verification.
  // The verify callback saves the raw buffer to req.rawBody before the parsed
  // result is placed on req.body — single stream read, no conflicts.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf;
      },
    }),
  );

  // Trust the immediate proxy hop (e.g. ngrok) for correct client IP detection.
  // NOT `true`: express-rate-limit v7 throws ERR_ERL_PERMISSIVE_TRUST_PROXY when
  // `trust proxy` is permissive, and `true` lets clients spoof X-Forwarded-For
  // to bypass IP-based rate limiting.
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // Security
  app.use(helmet());

  // H10: CORS — restrict origins by environment
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : isProduction
      ? [process.env.BACKEND_URL, process.env.ADMIN_URL, process.env.FRONTEND_URL].filter(Boolean) as string[]
      : ['http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Rate Limiting
  app.use(
    '/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per window per IP
      message: {
        statusCode: 429,
        message: 'Too many authentication attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/security',
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: {
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Global rate limit
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute globally
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Static file serving for uploads
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Audit Interceptor
  const auditService = app.get(AuditService);
  const reflector = app.get('Reflector');
  app.useGlobalInterceptors(new AuditInterceptor(reflector, auditService));

  // H12: Global exception filter to sanitize error messages
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // H11: Swagger — hidden behind NODE_ENV !== 'production'
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('P2N Crypto Marketplace API')
      .setDescription('The core API for the P2P Crypto Marketplace')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs available at: http://localhost:${process.env.PORT || 3000}/api/docs`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
