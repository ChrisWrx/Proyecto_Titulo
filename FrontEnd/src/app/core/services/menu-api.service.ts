import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MenuItem {
  id_menu: string;
  nombre: string;
  ruta: string;
  id_menu_padre: string | null;
  orden: number;
  es_padre: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MenuApiService {
  private readonly apiUrl = '/bff/menu';

  constructor(private readonly httpClient: HttpClient) {}

  getMenuByRoleName(nombreRol: string): Observable<MenuItem[]> {
    return this.httpClient.get<MenuItem[]>(`${this.apiUrl}/${encodeURIComponent(nombreRol)}`);
  }

  getMenuByToken(token: string): Observable<MenuItem[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.httpClient.get<MenuItem[]>(`${this.apiUrl}/me`, { headers });
  }
}
