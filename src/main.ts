import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors();

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
