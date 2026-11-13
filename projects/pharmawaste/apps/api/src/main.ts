import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Desativa bodyParser nativo para permitir que o @thallesp/nestjs-better-auth
  // faça o parsing correto de rotas de auth e re-adicione os parsers automaticamente
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Ativação de CORS para comunicação com os frontends Next.js (web + admin)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
  });

  // Validação automática de payloads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Documentação Swagger
  const config = new DocumentBuilder()
    .setTitle('PharmaWaste API')
    .setDescription('API de Gestão Preditiva de Validades em Farmácias (Better Auth + NestJS)')
    .setVersion('1.0')
    .addTag('Inventory & Waste Prevention')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`🚀 PharmaWaste API a correr em: http://localhost:${port}`);
  console.log(`📑 Documentação Swagger em: http://localhost:${port}/api/docs`);
}

bootstrap();
