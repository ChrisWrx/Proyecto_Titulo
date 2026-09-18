export interface MetricsBaselineResponse {
  modelo: string;
  fecha_entrenamiento: string;
  dataset: string;
  n_samples: number;
  metricas: Record<string, number>;
  descripcion: string;
}
