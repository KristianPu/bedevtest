import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const showSwagger = !(configService.get('NODE_ENV') === 'prod');
  const baseUrl = configService.get('BASE_URL');

  if (baseUrl) app.setGlobalPrefix(baseUrl);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  if (showSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('To-Do App')
      .setDescription('The To-Do App API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(
      baseUrl ? `${baseUrl}/api-docs` : 'api-docs',
      app,
      document,
    );
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
