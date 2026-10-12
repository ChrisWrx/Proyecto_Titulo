import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PacienteSearchResult {
  encontrado: boolean;
  id_paciente: string | null;
  rut: string | null;
  nombre_completo: string | null;
  fecha_nacimiento: string | null;
  edad: number;
  sexo: string | null;
  recursos_ficha: number;
  atenciones: number;
  alergias_registradas: number;
  medicamentos_activos: number;
  origen?: string;
  establecimiento_origen?: string;
}

export interface DetalleObservacionClinica {
  observacion: {
    id_observacion: string;
    tipo_observacion: string;
    valor: string;
    unidad_medida: string | null;
    fecha_observacion: string | null;
    fecha_registro: string;
  };
  paciente: {
    id_paciente: string;
    nombre_completo: string;
    rut: string;
    fecha_nacimiento: string | null;
    sexo: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  atencion: {
    id_atencion: string;
    tipo_atencion: string | null;
    motivo_consulta: string | null;
    estado: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
  };
  establecimiento: { nombre: string | null; tipo: string | null; direccion: string | null; comuna: string | null; region: string | null };
  profesionales: { atiende: string | null; registra: string | null };
  medicamentos: Array<{
    id_medicamento: string;
    nombre_medicamento: string;
    dosis: string | null;
    frecuencia: string | null;
    via_administracion: string | null;
    estado: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    intervalo_horas: number | null;
    dias_tratamiento: number | null;
  }>;
}

export type TipoRegistroHistorial = 'diagnosticos' | 'alergias' | 'medicamentos' | 'examenes';

export interface DetalleRegistroClinico {
  registro: Record<string, any>;
  paciente: DetalleObservacionClinica['paciente'];
  atencion: DetalleObservacionClinica['atencion'] | null;
  establecimiento: DetalleObservacionClinica['establecimiento'];
  profesionales: DetalleObservacionClinica['profesionales'];
}

export interface RecursoFichaItem {
  id_recurso: string;
  fecha: string;
  tipo_recurso: string;
  codigo_fhir: string;
  descripcion: string;
  establecimiento_origen: string;
  estado: string;
}

export interface OpcionCatalogo {
  id: string;
  nombre: string;
}

export interface ObservacionCatalogo extends OpcionCatalogo {
  tipo_valor: 'texto' | 'numerico';
  formato: 'texto' | 'presion_arterial' | 'temperatura' | 'decimal' | 'entero' | 'entero_rango';
  unidad_sugerida: string | null;
  ejemplo: string | null;
}

export interface CatalogosNuevaAtencion {
  regiones: OpcionCatalogo[];
  tipos_alergia: OpcionCatalogo[];
  tipos_atencion: string[];
  areas_derivacion: OpcionCatalogo[];
  estado_inicial: string | null;
}

export interface ContextoUsuarioAtencion {
  id_profesional: string | null;
  id_establecimiento: string | null;
  id_area: string | null;
  es_super_admin: boolean;
  codigo_rol: string;
  nombre_rol: string;
  es_administrador: boolean;
  profesional: string;
  centro: { nombre: string; tipo: string; direccion: string; comuna: string; region: string };
}

export interface FichaClinicaAtencion {
  atencion: {
    id_atencion: string;
    rut: string;
    nombre_paciente: string;
    estado: string;
    tipo_atencion: string;
    motivo_consulta: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    detalle_observaciones?: string | null;
    profesional_nombre: string | null;
  };
  licencia: {
    aplica: boolean;
    fecha_desde: string | null;
    fecha_hasta: string | null;
  };
  diagnosticos: Array<{ codigo_cie10?: string; descripcion: string; estado?: string; fecha_diagnostico?: string }>;
  observaciones: Array<{ tipo_observacion: string; valor: string; unidad_medida?: string; fecha_observacion?: string }>;
  medicamentos: Array<{
    nombre_medicamento: string;
    dosis?: string;
    via_administracion?: string;
    intervalo_horas: number;
    dias_tratamiento: number;
  }>;
  alergias: Array<{ id_alergia?: string; alergeno: string; tipo_reaccion?: string | null; criticidad?: string | null; observacion?: string | null }>;
  examenes: Array<{ id_examen?: string; tipo_examen: string; resultado?: string | null; fecha_examen?: string | null }>;
  medicamentos_catalogo: string[];
  diagnosticos_catalogo: OpcionCatalogo[];
  observaciones_catalogo: ObservacionCatalogo[];
  alergias_catalogo: OpcionCatalogo[];
  criticidad_catalogo: OpcionCatalogo[];
  examenes_catalogo: OpcionCatalogo[];
  puede_editar: boolean;
  puede_generar_diagnostico: boolean;
}

export interface DiagnosticoPdfReport extends FichaClinicaAtencion {
  establecimiento: {
    nombre?: string;
    tipo?: string;
    direccion?: string;
    comuna?: string;
    region?: string;
  };
  identidad?: {
    nombre_marca?: string;
    sitio_oficial?: string;
    logo_recurso?: string | null;
    logo_url?: string | null;
    color_primario?: string;
    color_secundario?: string;
    color_acento?: string;
    fuente_marca?: string;
    version?: string;
  };
  generado_en: string;
}

export interface PacienteNuevaAtencion {
  encontrado: boolean;
  id_paciente?: string;
  rut?: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  telefono?: string;
  direccion?: string;
  id_region?: string | null;
  id_comuna?: string | null;
}

export interface NuevaAtencionPayload {
  rut: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  id_region: string;
  id_comuna: string;
  id_tipo_alergia: string;
  id_area_derivada: string;
  tipo_atencion: string;
  fecha_atencion: string;
  motivo_consulta: string;
}

export interface DetalleDerivacionAtencion {
  atencion: {
    id_atencion: string;
    rut: string;
    nombre_paciente: string;
    tipo_atencion: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    motivo_consulta: string;
    id_area_derivada: string | null;
    area_derivada: string | null;
    id_area_destino: string | null;
    area_destino: string | null;
    id_profesional_atiende: string | null;
    profesional_nombre: string | null;
    profesional_registra: string | null;
    establecimiento_origen: string | null;
  };
  areas_derivacion: OpcionCatalogo[];
  profesionales_disponibles: Array<{
    id: string;
    nombre: string;
    profesion: string | null;
    especialidad: string | null;
    id_area: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class GestionClinicaApiService {
  private readonly apiUrl = '/bff/gestion-clinica';

  constructor(private readonly http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  }

  obtenerCatalogosNuevaAtencion(): Observable<CatalogosNuevaAtencion> {
    return this.http.get<CatalogosNuevaAtencion>(`${this.apiUrl}/nueva-atencion/catalogos`);
  }

  listarComunasPorRegion(idRegion: string): Observable<{ comunas: OpcionCatalogo[] }> {
    return this.http.get<{ comunas: OpcionCatalogo[] }>(`${this.apiUrl}/nueva-atencion/comunas`, {
      params: { id_region: idRegion }
    });
  }

  obtenerContextoUsuario(): Observable<ContextoUsuarioAtencion> {
    return this.http.get<ContextoUsuarioAtencion>(`${this.apiUrl}/nueva-atencion/contexto`, {
      headers: this.authHeaders()
    });
  }

  obtenerPacienteNuevaAtencion(rut: string): Observable<PacienteNuevaAtencion> {
    return this.http.get<PacienteNuevaAtencion>(`${this.apiUrl}/nueva-atencion/paciente`, { params: { rut } });
  }

  registrarNuevaAtencion(payload: NuevaAtencionPayload): Observable<{ id_atencion: string; id_paciente: string; paciente_nuevo: boolean }> {
    return this.http.post<{ id_atencion: string; id_paciente: string; paciente_nuevo: boolean }>(
      `${this.apiUrl}/nueva-atencion`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  buscarPacientePorRut(rut: string): Observable<PacienteSearchResult> {
    return this.http.get<PacienteSearchResult>(`${this.apiUrl}/pacientes/buscar`, {
      params: { rut }
    });
  }

  listarAtenciones(rut?: string): Observable<any[]> {
    const params = rut ? { rut } : {};
    return this.http.get<any[]>(`${this.apiUrl}/atenciones`, {
      params,
      headers: this.authHeaders()
    });
  }

  obtenerDetalleDerivacion(idAtencion: string, idAreaDerivada?: string): Observable<DetalleDerivacionAtencion> {
    const params = idAreaDerivada ? { id_area_derivada: idAreaDerivada } : {};
    return this.http.get<DetalleDerivacionAtencion>(`${this.apiUrl}/atenciones/${idAtencion}/detalle`, {
      params,
      headers: this.authHeaders()
    });
  }

  derivarAtencion(idAtencion: string, payload: { id_area_derivada: string; id_profesional_atiende?: string }): Observable<DetalleDerivacionAtencion> {
    return this.http.post<DetalleDerivacionAtencion>(`${this.apiUrl}/atenciones/${idAtencion}/derivar`, payload, {
      headers: this.authHeaders()
    });
  }

  obtenerFichaClinica(idAtencion: string): Observable<FichaClinicaAtencion> {
    return this.http.get<FichaClinicaAtencion>(`${this.apiUrl}/atenciones/${idAtencion}/ficha`, {
      headers: this.authHeaders()
    });
  }

  obtenerDiagnosticoPdf(idAtencion: string): Observable<DiagnosticoPdfReport> {
    return this.http.get<DiagnosticoPdfReport>(`${this.apiUrl}/atenciones/${idAtencion}/diagnostico`, {
      headers: this.authHeaders()
    });
  }

  guardarFichaClinica(idAtencion: string, payload: Record<string, unknown>): Observable<FichaClinicaAtencion> {
    return this.http.patch<FichaClinicaAtencion>(`${this.apiUrl}/atenciones/${idAtencion}/ficha`, payload, {
      headers: this.authHeaders()
    });
  }

  listarDiagnosticos(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/diagnosticos`, { params: { rut } });
  }

  listarAlergias(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alergias`, { params: { rut } });
  }

  listarMedicamentos(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medicamentos`, { params: { rut } });
  }

  listarExamenes(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/examenes`, { params: { rut } });
  }

  listarObservaciones(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/observaciones`, { params: { rut } });
  }

  obtenerDetalleObservacion(idObservacion: string): Observable<DetalleObservacionClinica> {
    const token = localStorage.getItem('access_token') ?? '';
    return this.http.get<DetalleObservacionClinica>(`${this.apiUrl}/observaciones/${idObservacion}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  obtenerDetalleRegistro(recurso: TipoRegistroHistorial, id: string): Observable<DetalleRegistroClinico> {
    const token = localStorage.getItem('access_token') ?? '';
    return this.http.get<DetalleRegistroClinico>(`${this.apiUrl}/${recurso}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  obtenerRecursosFicha(rut: string): Observable<RecursoFichaItem[]> {
    return this.http.get<RecursoFichaItem[]>(`${this.apiUrl}/recursos-ficha`, {
      params: { rut }
    });
  }
}
