import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuditoriaService } from './auditoria.service';

const UMBRAL_REPETICION_MS = 5000;

// Registra los accesos denegados (401 y 403) y devuelve la misma respuesta que Nest entregaría por defecto.
@Catch(HttpException)
export class AccesoDenegadoFilter implements ExceptionFilter {
  private readonly recientes = new Map<string, number>();

  constructor(private readonly auditoria: AuditoriaService) {}

  async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = exception.getStatus();

    if ((status === 401 || status === 403) && !req.originalUrl.startsWith('/auth/login')) {
      const ruta = this.generalizarRuta(req.originalUrl.split('?')[0]);
      if (this.debeRegistrar(`${req.ip}|${req.method}|${ruta}|${status}`)) {
        await this.auditoria.registrar(this.auditoria.idUsuarioDesdeToken(req.headers.authorization), {
          accion: 'ACCESO_DENEGADO',
          recurso: ruta.slice(0, 60),
          exito: false,
          mensaje: `${req.method} ${ruta} respondió HTTP ${status}`,
        });
      }
    }

    const cuerpo = exception.getResponse();
    res.status(status).json(typeof cuerpo === 'string' ? { statusCode: status, message: cuerpo } : cuerpo);
  }

  // Reemplaza identificadores (UUID, RUT) de la ruta para no guardar datos personales.
  private generalizarRuta(ruta: string): string {
    return ruta
      .split('/')
      .map((segmento) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segmento) || /^[0-9kK.\-]{7,}$/.test(segmento)
          ? ':id'
          : segmento,
      )
      .join('/');
  }

  // Evita llenar la bitácora si el mismo cliente repite la misma solicitud rechazada en pocos segundos.
  private debeRegistrar(clave: string): boolean {
    const ahora = Date.now();
    const ultimo = this.recientes.get(clave);
    if (ultimo && ahora - ultimo < UMBRAL_REPETICION_MS) return false;

    if (this.recientes.size > 1000) {
      for (const [k, t] of this.recientes) {
        if (ahora - t >= UMBRAL_REPETICION_MS) this.recientes.delete(k);
      }
    }
    this.recientes.set(clave, ahora);
    return true;
  }
}
