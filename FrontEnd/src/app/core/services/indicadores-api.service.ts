import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Indicador {
  orden: number;
  indicador: string;
  valor: number;
  subtitulo: string;
  variacion: string | null;
  icono: string;
}

export interface NoticiaItem {
  titulo: string;
  fecha: string;
}

export interface RedEstadoItem {
  nombre: string;
  activos: number;
  total: number;
  porcentaje: string;
}

export interface RedEstadoResponse {
  items: RedEstadoItem[];
  serviciosOperativos: number;
}

export interface AlertaClinicaItem {
  orden: number;
  nombre: string;
  valor: number;
  tipo: 'danger' | 'warning' | 'info';
  icono: string;
}

export interface AlertaDetalleAlergia {
  nombre_paciente: string;
  alergeno: string;
  tipo_reaccion: string;
  criticidad: string;
  observacion: string;
}

export interface AlertaDetalleMedicamento {
  nombre_medicamento: string;
  dosis: string;
  frecuencia: string;
  via_administracion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface AlertaDetalleExamen {
  tipo_examen: string;
  resultado: string;
  fecha_examen: string;
}

export type AlertaDetalle = AlertaDetalleAlergia | AlertaDetalleMedicamento | AlertaDetalleExamen;

@Injectable({
  providedIn: 'root',
})
export class IndicadoresApiService {
  private readonly apiUrl = '/bff/indicadores';

  constructor(private readonly httpClient: HttpClient) {}

  obtenerIndicadores(opcion = 1): Observable<Indicador[]> {
    return this.httpClient.get<Indicador[]>(`${this.apiUrl}/${opcion}`);
  }

  obtenerNoticias(): Observable<NoticiaItem[]> {
    return this.httpClient.get<NoticiaItem[]>(`${this.apiUrl}/panel/noticias`);
  }

  obtenerRedEstado(): Observable<RedEstadoResponse> {
    return this.httpClient.get<RedEstadoResponse>(`${this.apiUrl}/panel/red-estado`);
  }

  obtenerAlertasClinicas(): Observable<AlertaClinicaItem[]> {
    return this.httpClient.get<AlertaClinicaItem[]>(`${this.apiUrl}/panel/alertas`);
  }

  obtenerDetalleAlerta(tipo: string): Observable<AlertaDetalle[]> {
    return this.httpClient.get<AlertaDetalle[]>(`${this.apiUrl}/panel/alerta-detalle/${tipo}`);
  }
}
