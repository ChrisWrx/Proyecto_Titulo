import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HealthResponse } from '../models/health.model';
import { MetricsBaselineResponse } from '../models/metrics-baseline.model';
import { ComparacionMlResponse } from '../models/comparacion-ml.model';
import { ComparacionDlResponse } from '../models/comparacion-dl.model';
import { ComparacionBalanceoResponse } from '../models/comparacion-balanceo.model';
import { ShapGlobalResponse } from '../models/shap-global.model';
import { ModeloInfoResponse } from '../models/modelo-info.model';
import {
  AlertsResponse,
  DriftCheckResponse,
  DriftHistoryResponse,
  MonitoringStatusResponse
} from '../models/monitoring.model';

@Injectable({
  providedIn: 'root'
})
export class ChurnApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getMetricsBaseline(): Observable<MetricsBaselineResponse> {
    return this.http.get<MetricsBaselineResponse>(`${this.baseUrl}/api/metrics/baseline`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getComparacionMl(): Observable<ComparacionMlResponse> {
    return this.http.get<ComparacionMlResponse>(`${this.baseUrl}/api/metrics/comparacion-ml`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getComparacionDl(): Observable<ComparacionDlResponse> {
    return this.http.get<ComparacionDlResponse>(`${this.baseUrl}/api/metrics/comparacion-dl`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getComparacionBalanceo(): Observable<ComparacionBalanceoResponse> {
    return this.http.get<ComparacionBalanceoResponse>(`${this.baseUrl}/api/metrics/comparacion-balanceo`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getShapGlobal(): Observable<ShapGlobalResponse> {
    return this.http.get<ShapGlobalResponse>(`${this.baseUrl}/api/shap/global`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getModeloInfo(): Observable<ModeloInfoResponse> {
    return this.http.get<ModeloInfoResponse>(`${this.baseUrl}/api/modelo/info`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getMonitoringStatus(): Observable<MonitoringStatusResponse> {
    return this.http.get<MonitoringStatusResponse>(`${this.baseUrl}/api/monitoring/status`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  checkDrift(): Observable<DriftCheckResponse> {
    return this.http.get<DriftCheckResponse>(`${this.baseUrl}/api/monitoring/check_drift`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getDriftHistory(limit = 100, since?: string): Observable<DriftHistoryResponse> {
    let params = new HttpParams().set('limit', String(limit));
    if (since) {
      params = params.set('since', since);
    }

    return this.http.get<DriftHistoryResponse>(`${this.baseUrl}/api/monitoring/drift/history`, { params })
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  getAlerts(activeOnly = true): Observable<AlertsResponse> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<AlertsResponse>(`${this.baseUrl}/api/monitoring/alerts`, { params })
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código de error: ${error.status}, Mensaje: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
