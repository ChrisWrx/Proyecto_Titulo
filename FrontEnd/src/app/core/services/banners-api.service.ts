import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TipoBanner {
  id_tipo_banner: string;
  nombre: string;
  descripcion: string;
}

export interface Banner {
  id_banner: string;
  tipo_banner: string;
  titulo: string;
  descripcion: string;
  nombre_imagen: string;
  url_imagen: string;
  orden: number;
}

export interface BannerPayload {
  tipo_banner: string;
  titulo: string;
  descripcion: string;
  nombre_imagen: string;
  url_imagen: string;
  orden: number;
  usuario_registro?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BannersApiService {
  private readonly apiUrl = '/bff/banners';

  constructor(private readonly httpClient: HttpClient) {}

  obtenerTiposBanner(): Observable<TipoBanner[]> {
    return this.httpClient.get<TipoBanner[]>(`${this.apiUrl}/tipos/lista`);
  }

  obtenerBanners(): Observable<Banner[]> {
    return this.httpClient.get<Banner[]>(this.apiUrl);
  }

  obtenerBannerPorId(idBanner: string): Observable<Banner[]> {
    return this.httpClient.get<Banner[]>(`${this.apiUrl}/${idBanner}`);
  }

  crearBanner(banner: BannerPayload): Observable<Banner[]> {
    return this.httpClient.post<Banner[]>(this.apiUrl, banner);
  }

  modificarBanner(idBanner: string, banner: BannerPayload): Observable<Banner[]> {
    return this.httpClient.patch<Banner[]>(`${this.apiUrl}/${idBanner}`, banner);
  }

  eliminarBanner(idBanner: string): Observable<Banner[]> {
    return this.httpClient.delete<Banner[]>(`${this.apiUrl}/${idBanner}`);
  }

  obtenerCarrusel(): Observable<Banner[]> {
    return this.httpClient.get<Banner[]>(`${this.apiUrl}/carrusel/slides`);
  }
}
