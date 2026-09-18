export interface TopFeatureDrift {
  feature: string;
  metrica: string;
  valor: number;
  drift: boolean;
}

export interface DriftCheckResponse {
  drift_detectado: boolean;
  severidad_global: string;
  n_features_analizadas: number;
  n_features_drift: number;
  pct_features_drift: number;
  metricas_promedio: Record<string, number>;
  top_features_drift: TopFeatureDrift[];
  recomendacion: string;
  timestamp: string;
}

export interface DriftHistoryRecord {
  timestamp: string;
  drift_detectado: boolean;
  severidad: string;
  n_features_drift: number;
  pct_features_drift: number;
  metricas_promedio: Record<string, number>;
  n_samples: number;
}

export interface DriftStatistics {
  n_records: number;
  n_drift_detected: number;
  pct_drift_detected: number;
  date_range?: {
    start: string;
    end: string;
  };
  severidad_distribution?: Record<string, number>;
}

export interface DriftHistoryResponse {
  history: DriftHistoryRecord[];
  statistics: DriftStatistics;
  timestamp: string;
}

export interface AlertItem {
  timestamp: string;
  tipo: string;
  categoria: string;
  mensaje: string;
  top_features: Array<Record<string, unknown>>;
  recomendacion: string;
  activa: boolean;
}

export interface AlertsResponse {
  alertas: AlertItem[];
  n_total: number;
  n_criticas: number;
  n_advertencias: number;
  criticas: AlertItem[];
  advertencias: AlertItem[];
  timestamp: string;
}

export interface MonitoringStatusResponse {
  status: string;
  status_message: string;
  alertas_activas: {
    total: number;
    criticas: number;
    advertencias: number;
  };
  drift_24h: {
    n_checks: number;
    n_drift_detected: number;
    pct_drift: number;
  };
  metrics_recientes?: {
    last_check: string;
    drift_detectado: boolean;
    severidad: string;
    n_features_drift: number;
  };
  config: {
    umbrales: Record<string, unknown>;
  };
  monitoring_available: boolean;
  timestamp: string;
}
