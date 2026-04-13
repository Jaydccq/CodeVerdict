import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import { SECRETS } from './config/env';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // 25 MB covers the worst case: base64 inflates each 5 MB image to ~6.7 MB.
  // Individual image validation (5 MB cap) is enforced in AdminService.
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Return a clean JSON 413 instead of Express's default HTML response
  app.use(
    (
      err: Error & { type?: string; status?: number },
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err.type === 'entity.too.large' || err.status === 413) {
        res.status(413).json({
          statusCode: 413,
          message:
            'Request payload is too large. Each image must be under 5 MB.',
          error: 'Payload Too Large',
        });
        return;
      }
      next(err);
    },
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  if (SECRETS.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${SECRETS.APP_NAME} API`)
      .setDescription(`REST API for the ${SECRETS.APP_NAME}`)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: { supportedSubmitMethods: [] },
    });
  }

  app.enableCors({
    origin: SECRETS.CORS_ORIGIN,
    credentials: true,
  });

  // Serve compiled Vue 3 client (only present in production Docker image)
  if (SECRETS.NODE_ENV === 'production') {
    const publicDir = `${process.cwd()}/public`;
    app.useStaticAssets(publicDir);
    // SPA fallback: serve index.html for any route not handled by the API
    app.use(
      (
        req: { path: string },
        res: { sendFile: (path: string) => void },
        next: () => void,
      ) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(`${publicDir}/index.html`);
      },
    );
  }

  await app.listen(SECRETS.PORT);
  logger.log(`Application running on port ${SECRETS.PORT}`);
}
void bootstrap();
