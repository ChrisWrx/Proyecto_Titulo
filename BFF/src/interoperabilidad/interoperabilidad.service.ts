import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { FhirService } from '../fhir/fhir.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

export interface PermisosInteroperabilidad {
  rol: string | null;
  puede_ver: boolean;
  puede_editar: boolean;
}

export interface RegistroConsulta {
  id: string;
  resumen: string;
  origen: string;
  establecimiento: string;
  json: unknown;
  validacion: { valido: boolean | null; observaciones: string[] };
}

// Elementos mínimos esperados por recurso (R4); la validación es estructural, no contra perfiles completos.
const ELEMENTOS_REQUERIDOS: Record<string, { tipos: string[]; campos: string[] }> = {
  Patient: { tipos: ['Patient'], campos: ['id', 'identifier', 'name'] },
  Encounter: { tipos: ['Encounter'], campos: ['id', 'status', 'class', 'subject'] },
  Observation: { tipos: ['Observation'], campos: ['id', 'status', 'code'] },
  Condition: { tipos: ['Condition'], campos: ['id', 'code', 'subject'] },
  MedicationRequest: { tipos: ['MedicationRequest'], campos: ['id', 'status', 'intent', 'subject'] },
  MedicationStatement: { tipos: ['MedicationStatement', 'MedicationRequest'], campos: ['id', 'status', 'subject'] },
  AllergyIntolerance: { tipos: ['AllergyIntolerance'], campos: ['id', 'patient'] },
  DiagnosticReport: { tipos: ['DiagnosticReport', 'Observation'], campos: ['id', 'status', 'code'] },
};

@Injectable()
export class InteroperabilidadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fhirService: FhirService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ── Resumen del dashboard (existente) ─────────────────────────────────────

  async obtenerResumen() {
    const [red, recursosFhir, ultimasIntegraciones] = await Promise.all([
      this.dataSource.query('SELECT * FROM fn_lista_indicadores(2)'),
      this.dataSource.query('SELECT * FROM fn_recursos_fhir(1)'),
      this.dataSource.query('SELECT * FROM fn_integraciones(1)'),
    ]);

    return { red, recursosFhir, ultimasIntegraciones };
  }

  async obtenerRecursosFhir() {
    return await this.dataSource.query('SELECT * FROM fn_recursos_fhir(2)');
  }

  async obtenerIntegraciones() {
    return await this.dataSource.query('SELECT * FROM fn_integraciones(2)');
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private esUUID(valor?: string | null): boolean {
    return !!valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor.trim());
  }

  private extraerIdUsuario(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no enviado');
    }

    try {
      const secret = process.env.JWT_SECRET || 'SICHCP_SECRET_2026';
      const decoded = jwt.verify(authorization.substring(7).trim(), secret) as jwt.JwtPayload;
      if (!decoded.sub) throw new Error('Token sin usuario');
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private exigirUUID(id: string): string {
    if (!this.esUUID(id)) throw new BadRequestException('Identificador de integración no válido');
    return id.trim();
  }

  // Ejecuta fn_interoperabilidad y devuelve su columna datos; los RAISE EXCEPTION llegan como 400.
  private async fn<T = any>(opcion: number, id?: string | null, datos?: object | null): Promise<T> {
    try {
      const filas = await this.dataSource.query(
        'SELECT ok, mensaje, datos FROM public.fn_interoperabilidad($1::int, $2::uuid, $3::jsonb)',
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

  // ── Permisos ──────────────────────────────────────────────────────────────

  /** OPCIÓN 9: permisos del usuario autenticado. */
  async obtenerPermisos(authorization?: string): Promise<PermisosInteroperabilidad> {
    const idUsuario = this.extraerIdUsuario(authorization);
    const filas = await this.dataSource.query(
      'SELECT ok, datos FROM public.fn_interoperabilidad(9, $1::uuid, NULL)',
      [idUsuario],
    );
    if (!filas[0]?.ok) return { rol: null, puede_ver: false, puede_editar: false };
    return filas[0].datos as PermisosInteroperabilidad;
  }

  // Devuelve el id del usuario autenticado una vez validado el permiso.
  private async exigirAcceso(authorization: string | undefined, edicion: boolean): Promise<string> {
    const permisos = await this.obtenerPermisos(authorization);
    if (!permisos.puede_ver || (edicion && !permisos.puede_editar)) {
      throw new ForbiddenException('No tiene permisos para esta operación de interoperabilidad');
    }
    return this.extraerIdUsuario(authorization);
  }

  // La auditoría no debe interrumpir la operación principal (AuditoriaService registra el fallo en el log).
  private async auditar(idUsuario: string, datos: Record<string, unknown>): Promise<void> {
    await this.auditoria.registrar(idUsuario, datos);
  }

  /** OPCIÓN 10: tipos de integración para el combobox. */
  async obtenerTiposIntegracion(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(10);
  }

  /** OPCIÓN 11: mecanismos de autenticación para el combobox. */
  async obtenerAutenticaciones(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(11);
  }

  /** OPCIÓN 14: versiones FHIR para el combobox. */
  async obtenerVersionesFhir(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(14);
  }

  // ── Recursos FHIR ─────────────────────────────────────────────────────────

  /** OPCIÓN 1: catálogo de recursos FHIR. */
  async obtenerCatalogoFhir(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(1);
  }

  /** Consulta un recurso FHIR por RUT usando las fuentes externas (solo lectura, sin persistencia). */
  async consultarRecursoFhir(recurso: string, rut: string | undefined, authorization?: string) {
    const idUsuario = await this.exigirAcceso(authorization, false);

    if (!recurso || !ELEMENTOS_REQUERIDOS[recurso]) {
      throw new BadRequestException('Recurso FHIR no soportado');
    }
    const rutLimpio = (rut ?? '').trim();
    if (!rutLimpio) throw new BadRequestException('Debe indicar el RUT del paciente');

    const inicio = Date.now();
    let items: any[] = [];
    let error: string | null = null;

    try {
      switch (recurso) {
        case 'Patient': {
          const paciente = await this.fhirService.buscarPacienteFhir(rutLimpio);
          if (paciente) {
            const raw = await this.fhirService.obtenerPacienteRaw(rutLimpio);
            items = [{ ...paciente, raw: raw ?? paciente.raw }];
          }
          break;
        }
        case 'Encounter':
          items = await this.fhirService.listarAtencionesFhir(rutLimpio);
          break;
        case 'Observation':
          items = await this.fhirService.listarObservacionesFhir(rutLimpio);
          break;
        case 'Condition':
          items = await this.fhirService.listarDiagnosticosFhir(rutLimpio);
          break;
        case 'MedicationRequest':
        case 'MedicationStatement':
          items = await this.fhirService.listarMedicamentosFhir(rutLimpio);
          break;
        case 'AllergyIntolerance':
          items = await this.fhirService.listarAlergiasFhir(rutLimpio);
          break;
        case 'DiagnosticReport':
          items = await this.fhirService.listarExamenesFhir(rutLimpio);
          break;
      }
    } catch (err) {
      error = (err as Error).message;
    }

    const registros: RegistroConsulta[] = items.map((item, i) => this.armarRegistro(recurso, item, i));
    const estado = error ? 'ERROR' : registros.length ? 'OK' : 'SIN_RESULTADOS';
    await this.auditar(idUsuario, {
      accion: 'CONSULTA_FHIR',
      recurso,
      rut: rutLimpio,
      origen: [...new Set(registros.map((r) => r.origen).filter(Boolean))].join(', ') || undefined,
      exito: estado !== 'ERROR',
      mensaje: `${estado} (${registros.length} resultado(s))`,
    });

    return {
      recurso,
      rut: rutLimpio,
      total: registros.length,
      tiempo_ms: Date.now() - inicio,
      estado,
      mensaje: error ?? (registros.length ? 'Consulta exitosa' : 'El servidor no retornó recursos para este RUT'),
      registros,
    };
  }

  private armarRegistro(recurso: string, item: any, indice: number): RegistroConsulta {
    const raw = item?.raw && typeof item.raw === 'object' ? item.raw : null;
    const vistaNormalizada = { ...(item ?? {}) };
    delete vistaNormalizada.raw;

    const resumen = (() => {
      switch (recurso) {
        case 'Patient':
          return `${item.nombre_completo ?? ''} · ${item.rut ?? ''}`;
        case 'Encounter':
          return `${item.tipo_atencion ?? ''} · ${item.estado ?? ''}`;
        case 'Observation':
          return `${item.tipo_observacion ?? ''}: ${item.valor ?? ''} ${item.unidad_medida ?? ''}`.trim();
        case 'Condition':
          return `${item.codigo_cie10 ?? ''} ${item.descripcion ?? ''}`.trim();
        case 'AllergyIntolerance':
          return `${item.alergeno ?? ''} · ${item.criticidad ?? ''}`;
        case 'MedicationRequest':
        case 'MedicationStatement':
          return `${item.nombre_medicamento ?? ''} ${item.dosis ?? ''}`.trim();
        case 'DiagnosticReport':
          return `${item.tipo_examen ?? ''} · ${item.estado ?? ''}`;
        default:
          return '';
      }
    })();

    return {
      id: String(raw?.id ?? item?.id ?? `${recurso}-${indice + 1}`),
      resumen,
      origen: item?.origen ?? '',
      establecimiento: item?.establecimiento ?? item?.establecimiento_origen ?? '',
      json: raw ?? vistaNormalizada,
      validacion: this.validarRecurso(recurso, raw),
    };
  }

  private validarRecurso(recurso: string, raw: any) {
    if (!raw) {
      return { valido: null, observaciones: ['Sin JSON FHIR original: se muestra la vista normalizada de SICHCP'] };
    }

    const regla = ELEMENTOS_REQUERIDOS[recurso];
    const observaciones: string[] = [];

    if (!regla.tipos.includes(raw.resourceType)) {
      observaciones.push(`resourceType "${raw.resourceType ?? 'ausente'}" no corresponde a ${recurso}`);
    }
    for (const campo of regla.campos) {
      const valor = raw[campo];
      if (valor === undefined || valor === null || (Array.isArray(valor) && valor.length === 0)) {
        observaciones.push(`Falta el elemento "${campo}"`);
      }
    }
    return { valido: observaciones.length === 0, observaciones };
  }

  // ── Integraciones ─────────────────────────────────────────────────────────

  /** OPCIÓN 2: resumen por estado. */
  async resumenIntegraciones(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(2);
  }

  /** OPCIÓN 3: listado de integraciones. */
  async listarIntegraciones(authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(3);
  }

  /** OPCIÓN 4: detalle con últimos eventos. */
  async detalleIntegracion(id: string, authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(4, this.exigirUUID(id));
  }

  /** OPCIÓN 5: crear o actualizar. */
  async guardarIntegracion(id: string | null, datos: Record<string, unknown>, authorization?: string) {
    const idUsuario = await this.exigirAcceso(authorization, true);
    if (id) this.exigirUUID(id);
    const resultado = await this.fn<{ id_integracion: string }>(5, id, datos ?? {});
    await this.auditar(idUsuario, {
      accion: id ? 'ACTUALIZAR_INTEGRACION' : 'REGISTRAR_INTEGRACION',
      referencia: datos?.nombre,
      exito: true,
    });
    return resultado;
  }

  /** OPCIÓN 6: habilitar o deshabilitar. */
  async habilitarIntegracion(id: string, habilitada: boolean, authorization?: string) {
    const idUsuario = await this.exigirAcceso(authorization, true);
    const integracion = await this.fn<{ nombre: string }>(4, this.exigirUUID(id));
    const resultado = await this.fn(6, id, { habilitada: !!habilitada });
    await this.auditar(idUsuario, {
      accion: habilitada ? 'HABILITAR_INTEGRACION' : 'DESHABILITAR_INTEGRACION',
      referencia: integracion.nombre,
      exito: true,
    });
    return resultado;
  }

  /** OPCIÓN 8: historial de eventos. */
  async historialIntegraciones(id: string | undefined, soloErrores: boolean, authorization?: string) {
    await this.exigirAcceso(authorization, false);
    return await this.fn(8, id ? this.exigirUUID(id) : null, { solo_errores: soloErrores });
  }

  /** Prueba de conexión: consulta /metadata (CapabilityStatement) y registra el resultado (OPCIÓN 7). */
  async probarIntegracion(id: string, authorization?: string) {
    const idUsuario = await this.exigirAcceso(authorization, true);
    const idIntegracion = this.exigirUUID(id);
    const integracion = await this.fn<{ url_base: string; habilitada: boolean; nombre: string }>(4, idIntegracion);

    if (!integracion.habilitada) {
      throw new BadRequestException('La integración está deshabilitada');
    }
    const base = this.validarUrlExterna(integracion.url_base);

    const inicio = Date.now();
    let exito = false;
    let estado = 'ERROR';
    let codigoHttp: number | null = null;
    let mensaje = '';
    let version: string | null = null;
    let recursos: string[] | null = null;

    try {
      const respuesta = await fetch(`${base}/metadata`, {
        headers: { Accept: 'application/fhir+json, application/json' },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
      codigoHttp = respuesta.status;

      if (respuesta.ok) {
        const capacidades: any = await respuesta.json().catch(() => null);
        if (capacidades?.resourceType === 'CapabilityStatement') {
          exito = true;
          estado = 'CONECTADO';
          version = capacidades.fhirVersion ?? null;
          recursos = (capacidades.rest?.[0]?.resource ?? []).map((r: any) => String(r.type)).slice(0, 200);
          mensaje = `CapabilityStatement recibido (${recursos?.length ?? 0} recursos declarados)`;
        } else {
          mensaje = '/metadata respondió, pero no es un CapabilityStatement válido';
        }
      } else {
        // Repositorios de ejemplos (IG) no exponen /metadata: se verifica al menos la disponibilidad de la URL base.
        const alcance = await fetch(base, { redirect: 'manual', signal: AbortSignal.timeout(8000) }).catch(() => null);
        if (alcance && alcance.status < 500) {
          exito = true;
          estado = 'ALCANZABLE';
          codigoHttp = alcance.status;
          mensaje = `Servidor alcanzable (HTTP ${alcance.status}), pero no expone /metadata (HTTP ${respuesta.status})`;
        } else {
          mensaje = `El servidor respondió HTTP ${respuesta.status} en /metadata`;
        }
      }
    } catch (err) {
      mensaje = `Sin conexión: ${(err as Error).message}`;
    }

    const latencia = Date.now() - inicio;
    await this.fn(7, idIntegracion, {
      tipo: 'PRUEBA',
      id_usuario: idUsuario,
      exito,
      estado,
      codigo_http: codigoHttp,
      latencia_ms: latencia,
      mensaje,
      version_fhir: version,
      ...(recursos ? { recursos } : {}),
    });
    await this.auditar(idUsuario, { accion: 'PRUEBA_CONEXION', referencia: integracion.nombre, exito, mensaje });

    return { exito, estado, codigo_http: codigoHttp, latencia_ms: latencia, mensaje, version_fhir: version, recursos: recursos ?? [] };
  }

  // Evita que una URL configurada apunte a la red interna del servidor (SSRF).
  private validarUrlExterna(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL base no válida');
    }

    const host = parsed.hostname.toLowerCase();
    const interno =
      !/^https?:$/.test(parsed.protocol) ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '::1' ||
      host === '[::1]' ||
      /^(127|10|0)\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);

    if (interno) {
      throw new BadRequestException('La URL base debe apuntar a un servidor externo (http/https)');
    }
    return parsed.toString().replace(/\/+$/, '');
  }
}
