import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  // Deja constancia del cierre de sesión en la auditoría.
  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` } }
    );
  }
}
