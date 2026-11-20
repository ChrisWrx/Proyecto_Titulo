import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { contextoSolicitud } from './contexto-solicitud';

export interface PermisosAuditoria {
  rol: string | null;
  puede_ver: boolean;
  puede_exportar: boolean;
  puede_configurar: boolean;
}

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  id_usuario?: string;
  rol?: string;
  modulo?: string;
  accion?: string;
  resultado?: string;
  pagina?: string;
  tamano?: string;
}

const FILTROS_PERMITIDOS: (keyof FiltrosAuditoria)[] = ['desde', 'hasta', 'id_usuario', 'rol', 'modulo', 'accion', 'resultado', 'pagina', 'tamano'];

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Utilidades ────────────────────────────────────────────────────────────

  private esUUID(valor?: string | null): boolean {
    return !!valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor.trim());
  }

  /** Id del usuario del token o null si falta o es inválido (no lanza: se usa al auditar). */
  idUsuarioDesdeToken(authorization?: string): string | null {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      const secret = process.env.JWT_SECRET || 'SICHCP_SECRET_2026';
      const decoded = jwt.verify(authorization.substring(7).trim(), secret) as jwt.JwtPayload;
      return typeof decoded.sub === 'string' ? decoded.sub : null;
    } catch {
      return null;
    }
  }

  private exigirIdUsuario(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Token no enviado');
    const id = this.idUsuarioDesdeToken(authorization);
    if (!id) throw new UnauthorizedException('Token inválido');
    return id;
  }

  // Ejecuta fn_auditoria y devuelve su columna datos; los RAISE EXCEPTION llegan como 400.
  private async fn<T = any>(opcion: number, id?: string | null, datos?: object | null): Promise<T> {
    try {
      const filas = await this.dataSource.query(
        'SELECT ok, mensaje, datos FROM public.fn_auditoria($1::int, $2::uuid, $3::jsonb)',
        [opcion, id ?? null, datos ? JSON.stringify(datos) : null],
      );
      const fila = filas[0];
      if (!fila?.ok) throw new BadRequestException(fila?.mensaje ?? 'No fue posible completar la operación');
      return fila.datos as T;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const driverError = (error as { driverError?: { code?: string; message?: string } }).driverError;
      if (driverError?.code === 'P0001' && driverError.message) {
        throw new BadRequestException(driverError.message);
      }
      throw error;
    }
  }

  // Solo se transmiten a la función los filtros conocidos y con valor.
  private limpiarFiltros(filtros: FiltrosAuditoria): Record<string, string> {
    const limpio: Record<string, string> = {};
    for (const clave of FILTROS_PERMITIDOS) {
      const valor = filtros?.[clave];
      if (typeof valor === 'string' && valor.trim()) limpio[clave] = valor.trim();
    }
    if (limpio.id_usuario && !this.esUUID(limpio.id_usuario)) {
      throw new BadRequestException('Identificador de usuario no válido');
    }
    return limpio;
  }

  // ── Registro (usado por los demás módulos) ────────────────────────────────

  /** OPCIÓN 1: registra un evento; un fallo no interrumpe la operación principal, solo queda en el log. */
  async registrar(idUsuario: string | null, datos: Record<string, unknown>): Promise<void> {
    try {
      const ip = contextoSolicitud.getStore()?.ip ?? undefined;
      await this.fn(1, idUsuario, { ip_origen: ip, ...datos });
    } catch (err) {
      this.logger.error(`No se pudo registrar la auditoría: ${(err as Error).message}`);
    }
  }

  async registrarDesdeToken(authorization: string | undefined, datos: Record<string, unknown>): Promise<void> {
    const idUsuario = this.idUsuarioDesdeToken(authorization);
    if (idUsuario) await this.registrar(idUsuario, datos);
  }

  // ── Permisos ──────────────────────────────────────────────────────────────

  /** OPCIÓN 2: permisos del usuario autenticado. */
  async obtenerPermisos(authorization?: string): Promise<PermisosAuditoria> {
    const idUsuario = this.exigirIdUsuario(authorization);
    const filas = await this.dataSource.query(
      'SELECT ok, datos FROM public.fn_auditoria(2, $1::uuid, NULL)',
      [idUsuario],
    );
    if (!filas[0]?.ok) return { rol: null, puede_ver: false, puede_exportar: false, puede_configurar: false };
    return filas[0].datos as PermisosAuditoria;
  }

  private async exigirAcceso(authorization: string | undefined, exportar = false): Promise<string> {
    const permisos = await this.obtenerPermisos(authorization);
    if (!permisos.puede_ver || (exportar && !permisos.puede_exportar)) {
      throw new ForbiddenException('No tiene permisos para esta operación de auditoría');
    }
    return this.exigirIdUsuario(authorization);
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  /** OPCIÓN 12: política de retención vigente y eventos fuera de plazo. */
  async obtenerRetencion(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(12);
  }

  /** OPCIÓN 13: define la retención en meses (solo roles con permiso de configuración). */
  async definirRetencion(meses: unknown, authorization?: string) {
    const idUsuario = await this.exigirConfiguracion(authorization);
    const resultado = await this.fn(13, idUsuario, { retencion_meses: meses === undefined || meses === null ? '' : String(meses) });
    await this.registrar(idUsuario, { accion: 'CONFIGURAR_RETENCION', exito: true, mensaje: `Retención definida en ${meses} mes(es)` });
    return resultado;
  }

  /** OPCIÓN 14: purga los eventos fuera de plazo; sin confirmación explícita solo simula. */
  async purgarFueraDePlazo(confirmar: boolean, authorization?: string) {
    const idUsuario = await this.exigirConfiguracion(authorization);
    const resultado = await this.fn<{ eventos_afectados: number; simulacion: boolean }>(14, idUsuario, { simular: !confirmar });
    if (!resultado.simulacion) {
      await this.registrar(idUsuario, { accion: 'PURGAR_AUDITORIA', exito: true, mensaje: `${resultado.eventos_afectados} evento(s) eliminado(s) por retención` });
    }
    return resultado;
  }

  private async exigirConfiguracion(authorization: string | undefined): Promise<string> {
    const permisos = await this.obtenerPermisos(authorization);
    if (!permisos.puede_configurar) {
      throw new ForbiddenException('No tiene permisos para configurar la retención de la auditoría');
    }
    return this.exigirIdUsuario(authorization);
  }

  /** OPCIÓN 3: indicadores del día. */
  async obtenerIndicadores(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(3);
  }

  /** OPCIÓN 4: eventos filtrados y paginados. */
  async listarEventos(filtros: FiltrosAuditoria, authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(4, null, this.limpiarFiltros(filtros));
  }

  /** OPCIÓN 5: detalle de un evento. */
  async obtenerEvento(id: string, authorization?: string) {
    await this.exigirAcceso(authorization);
    if (!this.esUUID(id)) throw new BadRequestException('Identificador de evento no válido');
    return await this.fn(5, id.trim());
  }

  /** OPCIÓN 11: exporta los eventos filtrados (hasta 5000) y deja constancia de la exportación. */
  async exportarEventos(filtros: FiltrosAuditoria, authorization?: string) {
    const idUsuario = await this.exigirAcceso(authorization, true);
    const resultado = await this.fn<{ total: number; filas: unknown[] }>(11, null, this.limpiarFiltros(filtros));
    await this.registrar(idUsuario, {
      accion: 'EXPORTAR_AUDITORIA',
      exito: true,
      mensaje: `${resultado.filas.length} de ${resultado.total} evento(s) exportado(s)`,
    });
    return resultado;
  }

  // ── Catálogos (combobox) ──────────────────────────────────────────────────

  /** OPCIÓN 6. */
  async catalogoModulos(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(6);
  }

  /** OPCIÓN 7: acciones, opcionalmente de un módulo. */
  async catalogoAcciones(modulo: string | undefined, authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(7, null, modulo ? { modulo } : null);
  }

  /** OPCIÓN 8. */
  async catalogoUsuarios(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(8);
  }

  /** OPCIÓN 9. */
  async catalogoRoles(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(9);
  }

  /** OPCIÓN 10. */
  async catalogoResultados(authorization?: string) {
    await this.exigirAcceso(authorization);
    return await this.fn(10);
  }
}
