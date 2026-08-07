import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Captures the raw request body (required for HMAC signature verification)
 * while keeping a JSON-parsed body available for NestJS @Body() decorators.
 * Mounted BEFORE Nest's own JSON parser (registered during app.listen), so the
 * raw parser consumes the stream first; Nest's parser then skips these paths.
 */
interface RawBodyRequest extends express.Request {
  rawBody?: Buffer;
}

function rawBodyForWebhook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  express.raw({
    type: 'application/json',
    verify: (rawReq: express.Request, _res: express.Response, buf: Buffer) => {
      (rawReq as RawBodyRequest).rawBody = buf;
    },
  })(req, res, (err?: any) => {
    if (err) return next(err);
    if (Buffer.isBuffer(req.body) && req.body.length) {
      try {
        req.body = JSON.parse(req.body.toString('utf8')) as object;
      } catch {
        return next(new BadRequestException('Invalid JSON body'));
      }
    }
    next();
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Trust the immediate proxy hop (e.g. ngrok) for correct client IP detection.
  // NOT `true`: express-rate-limit v7 throws ERR_ERL_PERMISSIVE_TRUST_PROXY when
  // `trust proxy` is permissive, and `true` lets clients spoof X-Forwarded-For
  // to bypass IP-based rate limiting.
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.enableCors();

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

  // Raw body for webhook signature verification (Paystack HMAC)
  app.use('/paystack/webhook', rawBodyForWebhook);

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

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('P2N Crypto Marketplace API')
    .setDescription('The core API for the P2P Crypto Marketplace')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
