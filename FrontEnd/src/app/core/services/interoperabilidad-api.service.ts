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

@Injectable({ providedIn: 'root' })
export class InteroperabilidadApiService {
  private readonly apiUrl = '/bff/interoperabilidad';

  constructor(private readonly http: HttpClient) {}

  obtenerResumen(): Observable<ResumenInteroperabilidad> {
    return this.http.get<ResumenInteroperabilidad>(this.apiUrl);
  }

  obtenerRecursosFhir(): Observable<RecursoFhir[]> {
    return this.http.get<RecursoFhir[]>(`${this.apiUrl}/recursos-fhir`);
  }

  obtenerIntegraciones(): Observable<Integracion[]> {
    return this.http.get<Integracion[]>(`${this.apiUrl}/integraciones`);
  }
}
