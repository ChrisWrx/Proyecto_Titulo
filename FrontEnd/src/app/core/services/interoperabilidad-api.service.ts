import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RedNodo {
  orden: number;
  indicador: string;
  valor: number;
  subtitulo: string;
  variacion: string | null;
  icono: string;
}

export interface RecursoFhir {
  orden: number;
  codigo: string;
  nombre: string;
  total_uso: number;
  porcentaje_uso: number;
}

export interface Integracion {
  fecha_integracion: string;
  nombre_establecimiento: string;
  tipo_establecimiento: string;
  estado: string;
  tipo_integracion: string;
}

export interface ResumenInteroperabilidad {
  red: RedNodo[];
  recursosFhir: RecursoFhir[];
  ultimasIntegraciones: Integracion[];
}

export interface PermisosInteroperabilidad {
  rol: string | null;
  puede_ver: boolean;
  puede_editar: boolean;
}

export interface RecursoCatalogo {
  orden: number;
  recurso: string;
  nombre: string;
  descripcion: string;
  icono: string;
  soportado: boolean;
  requiere_rut: boolean;
}

export interface ValidacionRecurso {
  valido: boolean | null;
  observaciones: string[];
}

export interface RegistroConsultaFhir {
  id: string;
  resumen: string;
  origen: string;
  establecimiento: string;
  json: unknown;
  validacion: ValidacionRecurso;
}

export interface ResultadoConsultaFhir {
  recurso: string;
  rut: string;
  total: number;
  tiempo_ms: number;
  estado: 'OK' | 'SIN_RESULTADOS' | 'ERROR';
  mensaje: string;
  registros: RegistroConsultaFhir[];
}

export type EstadoConexion = 'SIN_VERIFICAR' | 'CONECTADO' | 'ALCANZABLE' | 'ERROR';

export interface IntegracionExterna {
  id_integracion: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  url_base: string;
  version_fhir: string;
  autenticacion: string;
  id_establecimiento: string | null;
  establecimiento?: string | null;
  habilitada: boolean;
  estado_conexion: EstadoConexion;
  ultima_verificacion: string | null;
  latencia_ms: number | null;
  recursos_soportados: string[];
}

export interface ResumenIntegraciones {
  total: number;
  habilitadas: number;
  conectadas: number;
  con_error: number;
  sin_verificar: number;
}

export interface EventoIntegracion {
  id_log: string;
  integracion: string;
  tipo: string;
  recurso: string | null;
  exito: boolean;
  codigo_http: number | null;
  latencia_ms: number | null;
  mensaje: string | null;
  fecha: string;
}

export interface DetalleIntegracion extends IntegracionExterna {
  ultimos_eventos: Omit<EventoIntegracion, 'id_log' | 'integracion'>[];
}

export interface OpcionCatalogoInterop {
  id: string;
  nombre: string;
  predeterminado?: boolean;
}

export interface GuardarIntegracionPayload {
  nombre: string;
  descripcion?: string;
  tipo: string;
  url_base: string;
  version_fhir?: string;
  autenticacion: string;
}

export interface ResultadoPruebaIntegracion {
  exito: boolean;
  estado: EstadoConexion;
  codigo_http: number | null;
  latencia_ms: number;
  mensaje: string;
  version_fhir: string | null;
  recursos: string[];
}

@Injectable({ providedIn: 'root' })
export class InteroperabilidadApiService {
  private readonly apiUrl = '/bff/interoperabilidad';

  constructor(private readonly http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  }

  obtenerResumen(): Observable<ResumenInteroperabilidad> {
    return this.http.get<ResumenInteroperabilidad>(this.apiUrl);
  }

  obtenerRecursosFhir(): Observable<RecursoFhir[]> {
    return this.http.get<RecursoFhir[]>(`${this.apiUrl}/recursos-fhir`);
  }

  obtenerIntegraciones(): Observable<Integracion[]> {
    return this.http.get<Integracion[]>(`${this.apiUrl}/integraciones`);
  }

  obtenerPermisos(): Observable<PermisosInteroperabilidad> {
    return this.http.get<PermisosInteroperabilidad>(`${this.apiUrl}/acceso`, { headers: this.authHeaders() });
  }

  obtenerCatalogoFhir(): Observable<RecursoCatalogo[]> {
    return this.http.get<RecursoCatalogo[]>(`${this.apiUrl}/fhir/catalogo`, { headers: this.authHeaders() });
  }

  consultarRecursoFhir(recurso: string, rut: string): Observable<ResultadoConsultaFhir> {
    return this.http.post<ResultadoConsultaFhir>(`${this.apiUrl}/fhir/consultar`, { recurso, rut }, {
      headers: this.authHeaders()
    });
  }

  obtenerTiposIntegracion(): Observable<OpcionCatalogoInterop[]> {
    return this.http.get<OpcionCatalogoInterop[]>(`${this.apiUrl}/gestion/tipos`, { headers: this.authHeaders() });
  }

  obtenerAutenticaciones(): Observable<OpcionCatalogoInterop[]> {
    return this.http.get<OpcionCatalogoInterop[]>(`${this.apiUrl}/gestion/autenticaciones`, { headers: this.authHeaders() });
  }

  obtenerVersionesFhir(): Observable<OpcionCatalogoInterop[]> {
    return this.http.get<OpcionCatalogoInterop[]>(`${this.apiUrl}/gestion/versiones`, { headers: this.authHeaders() });
  }

  resumenIntegraciones(): Observable<ResumenIntegraciones> {
    return this.http.get<ResumenIntegraciones>(`${this.apiUrl}/gestion/resumen`, { headers: this.authHeaders() });
  }

  listarIntegraciones(): Observable<IntegracionExterna[]> {
    return this.http.get<IntegracionExterna[]>(`${this.apiUrl}/gestion/integraciones`, { headers: this.authHeaders() });
  }

  detalleIntegracion(id: string): Observable<DetalleIntegracion> {
    return this.http.get<DetalleIntegracion>(`${this.apiUrl}/gestion/integraciones/${id}`, { headers: this.authHeaders() });
  }

  guardarIntegracion(payload: GuardarIntegracionPayload, id?: string): Observable<{ id_integracion: string }> {
    const url = `${this.apiUrl}/gestion/integraciones`;
    return id
      ? this.http.put<{ id_integracion: string }>(`${url}/${id}`, payload, { headers: this.authHeaders() })
      : this.http.post<{ id_integracion: string }>(url, payload, { headers: this.authHeaders() });
  }

  habilitarIntegracion(id: string, habilitada: boolean): Observable<{ id_integracion: string; habilitada: boolean }> {
    return this.http.patch<{ id_integracion: string; habilitada: boolean }>(
      `${this.apiUrl}/gestion/integraciones/${id}/habilitar`,
      { habilitada },
      { headers: this.authHeaders() }
    );
  }

  probarIntegracion(id: string): Observable<ResultadoPruebaIntegracion> {
    return this.http.post<ResultadoPruebaIntegracion>(
      `${this.apiUrl}/gestion/integraciones/${id}/probar`,
      {},
      { headers: this.authHeaders() }
    );
  }

  historial(soloErrores: boolean, id?: string): Observable<EventoIntegracion[]> {
    const params: Record<string, string> = { soloErrores: String(soloErrores) };
    if (id) params['id'] = id;
    return this.http.get<EventoIntegracion[]>(`${this.apiUrl}/gestion/historial`, { headers: this.authHeaders(), params });
  }
}
