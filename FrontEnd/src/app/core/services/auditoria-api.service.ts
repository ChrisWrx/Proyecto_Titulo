import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PermisosAuditoria {
  rol: string | null;
  puede_ver: boolean;
  puede_exportar: boolean;
  puede_configurar: boolean;
}

export interface RetencionAuditoria {
  retencion_meses: number | null;
  eventos_total: number;
  evento_mas_antiguo: string | null;
  eventos_fuera_de_plazo: number | null;
}

export interface IndicadoresAuditoria {
  accesos_hoy: number;
  fallidos_hoy: number;
  usuarios_activos_hoy: number;
  consultas_hoy: number;
}

export interface OpcionAuditoria {
  id: string;
  nombre: string;
}

export interface EventoAuditoria {
  id_auditoria: string;
  fecha: string;
  usuario: string | null;
  rol: string | null;
  modulo: string;
  accion: string;
  accion_codigo: string;
  recurso: string | null;
  rut_enmascarado: string | null;
  referencia: string | null;
  ip_origen: string | null;
  origen: string | null;
  exito: boolean;
  mensaje: string | null;
}

export interface DetalleEventoAuditoria extends EventoAuditoria {
  username: string | null;
}

export interface PaginaEventosAuditoria {
  total: number;
  pagina: number;
  tamano: number;
  filas: EventoAuditoria[];
}

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  id_usuario?: string;
  rol?: string;
  modulo?: string;
  accion?: string;
  resultado?: string;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaApiService {
  private readonly apiUrl = '/bff/auditoria';

  constructor(private readonly http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  }

  // Solo se envían los filtros con valor.
  private params(filtros: FiltrosAuditoria): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') params[clave] = String(valor);
    }
    return params;
  }

  obtenerPermisos(): Observable<PermisosAuditoria> {
    return this.http.get<PermisosAuditoria>(`${this.apiUrl}/acceso`, { headers: this.authHeaders() });
  }

  obtenerRetencion(): Observable<RetencionAuditoria> {
    return this.http.get<RetencionAuditoria>(`${this.apiUrl}/retencion`, { headers: this.authHeaders() });
  }

  obtenerIndicadores(): Observable<IndicadoresAuditoria> {
    return this.http.get<IndicadoresAuditoria>(`${this.apiUrl}/indicadores`, { headers: this.authHeaders() });
  }

  listarEventos(filtros: FiltrosAuditoria): Observable<PaginaEventosAuditoria> {
    return this.http.get<PaginaEventosAuditoria>(`${this.apiUrl}/eventos`, {
      headers: this.authHeaders(),
      params: this.params(filtros)
    });
  }

  obtenerEvento(id: string): Observable<DetalleEventoAuditoria> {
    return this.http.get<DetalleEventoAuditoria>(`${this.apiUrl}/eventos/${id}`, { headers: this.authHeaders() });
  }

  exportarEventos(filtros: FiltrosAuditoria): Observable<{ total: number; filas: EventoAuditoria[] }> {
    return this.http.get<{ total: number; filas: EventoAuditoria[] }>(`${this.apiUrl}/exportar`, {
      headers: this.authHeaders(),
      params: this.params({ ...filtros, pagina: undefined, tamano: undefined })
    });
  }

  catalogoModulos(): Observable<OpcionAuditoria[]> {
    return this.http.get<OpcionAuditoria[]>(`${this.apiUrl}/catalogos/modulos`, { headers: this.authHeaders() });
  }

  catalogoAcciones(modulo?: string): Observable<OpcionAuditoria[]> {
    return this.http.get<OpcionAuditoria[]>(`${this.apiUrl}/catalogos/acciones`, {
      headers: this.authHeaders(),
      params: modulo ? { modulo } : {}
    });
  }

  catalogoUsuarios(): Observable<OpcionAuditoria[]> {
    return this.http.get<OpcionAuditoria[]>(`${this.apiUrl}/catalogos/usuarios`, { headers: this.authHeaders() });
  }

  catalogoRoles(): Observable<OpcionAuditoria[]> {
    return this.http.get<OpcionAuditoria[]>(`${this.apiUrl}/catalogos/roles`, { headers: this.authHeaders() });
  }

  catalogoResultados(): Observable<OpcionAuditoria[]> {
    return this.http.get<OpcionAuditoria[]>(`${this.apiUrl}/catalogos/resultados`, { headers: this.authHeaders() });
  }
}
