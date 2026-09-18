import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  nombre_completo: string;
  correo: string;
  username: string;
  area: string;
  id_rol: string;
  nombre_rol: string;
  rut_usuario: string | null;
}

export interface DetalleUsuario {
  id_establecimiento?: string | null;
  nombre_establecimiento?: string | null;
  tipo_establecimiento?: string | null;
  comuna_establecimiento?: string | null;
  direccion_establecimiento?: string | null;
  nombres_usuario: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  username: string;
  area: string;
  id_area?: string | null;
  id_rol: string;
  nombre_rol: string;
  rut_usuario: string;
}

export interface AreaUsuario {
  id_area: string;
  nombre: string;
}

export interface RolUsuario {
  id_rol: string;
  nombre: string;
}

export interface EstablecimientoSaludItem {
  id_establecimiento: string;
  nombre: string;
  tipo: string;
  direccion: string;
  comuna: string;
  region: string;
}

export interface GuardarUsuario {
  id_usuario?: string;
  rut?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  correo?: string;
  username?: string;
  id_area?: string;
  id_rol?: string;
  id_establecimiento?: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosApiService {
  private readonly apiUrl = '/bff/usuarios';

  constructor(private readonly httpClient: HttpClient) {}

  listarUsuarios(idEstablecimiento?: string): Observable<Usuario[]> {
    const params: Record<string, string> = {};
    if (idEstablecimiento) {
      params['id_establecimiento'] = idEstablecimiento;
    }
    return this.httpClient.get<Usuario[]>(this.apiUrl, { params });
  }

  obtenerUsuarioPorRut(rut: string): Observable<DetalleUsuario | null> {
    return this.httpClient.get<DetalleUsuario | null>(`${this.apiUrl}/${encodeURIComponent(rut)}`);
  }

  listarAreas(): Observable<AreaUsuario[]> {
    return this.httpClient.get<AreaUsuario[]>(`${this.apiUrl}/areas/lista`);
  }

  listarRoles(): Observable<RolUsuario[]> {
    return this.httpClient.get<RolUsuario[]>(`${this.apiUrl}/roles/lista`);
  }

  listarEstablecimientos(): Observable<EstablecimientoSaludItem[]> {
    return this.httpClient.get<EstablecimientoSaludItem[]>(`${this.apiUrl}/establecimientos/lista`);
  }

  crearUsuario(datos: GuardarUsuario): Observable<Usuario> {
    return this.httpClient.post<Usuario>(this.apiUrl, datos);
  }

  actualizarUsuario(rut: string, datos: GuardarUsuario): Observable<Usuario> {
    return this.httpClient.patch<Usuario>(`${this.apiUrl}/${encodeURIComponent(rut)}`, datos);
  }

  cambiarContrasena(rut: string, password: string): Observable<{ actualizado: boolean; username: string | null }> {
    return this.httpClient.patch<{ actualizado: boolean; username: string | null }>(
      `${this.apiUrl}/${encodeURIComponent(rut)}/password`,
      { rut, password },
    );
  }

  desactivarUsuario(rut: string): Observable<{ mensaje: string; username?: string }> {
    return this.httpClient.patch<{ mensaje: string; username?: string }>(
      `${this.apiUrl}/${encodeURIComponent(rut)}/desactivar`,
      {},
    );
  }
}
