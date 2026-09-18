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

export interface EstadoClinicaCatalogo {
  categoria: string;
  valor: string;
}

@Injectable({
  providedIn: 'root'
})
export class GestionClinicaApiService {
  private readonly apiUrl = '/bff/gestion-clinica';

  constructor(private readonly http: HttpClient) {}

  listarEstadosClinica(): Observable<EstadoClinicaCatalogo[]> {
    return this.http.get<EstadoClinicaCatalogo[]>(`${this.apiUrl}/estados`);
  }

  buscarPacientePorRut(rut: string): Observable<PacienteSearchResult> {
    return this.http.get<PacienteSearchResult>(`${this.apiUrl}/pacientes/buscar`, {
      params: { rut }
    });
  }

  listarAtenciones(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/atenciones`, { params: { rut } });
  }

  crearAtencion(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/atenciones`, payload);
  }

  listarDiagnosticos(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/diagnosticos`, { params: { rut } });
  }

  crearDiagnostico(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/diagnosticos`, payload);
  }

  listarAlergias(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alergias`, { params: { rut } });
  }

  crearAlergia(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/alergias`, payload);
  }

  listarMedicamentos(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medicamentos`, { params: { rut } });
  }

  crearMedicamento(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/medicamentos`, payload);
  }

  listarExamenes(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/examenes`, { params: { rut } });
  }

  crearExamen(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/examenes`, payload);
  }

  listarObservaciones(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/observaciones`, { params: { rut } });
  }

  crearObservacion(payload: Record<string, any>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/observaciones`, payload);
  }

  obtenerRecursosFicha(rut: string): Observable<RecursoFichaItem[]> {
    return this.http.get<RecursoFichaItem[]>(`${this.apiUrl}/recursos-ficha`, {
      params: { rut }
    });
  }
}
