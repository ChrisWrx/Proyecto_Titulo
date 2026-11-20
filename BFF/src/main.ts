import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { contextoSolicitud, normalizarIp } from './auditoria/contexto-solicitud';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Solo se confía en X-Forwarded-For cuando la conexión directa viene del propio equipo (proxy local).
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
  app.use((req: { ip?: string; socket?: { remoteAddress?: string } }, _res: unknown, next: () => void) => {
    contextoSolicitud.run({ ip: normalizarIp(req.ip ?? req.socket?.remoteAddress) }, next);
  });
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
