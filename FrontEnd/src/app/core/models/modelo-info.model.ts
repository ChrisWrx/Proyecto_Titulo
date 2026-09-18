export interface ModeloInfoResponse {
  modelo_seleccionado: string;
  tipo: string;
  fecha_entrenamiento: string;
  tecnica_balanceo: string;
  dataset: string;
  metricas_finales: Record<string, number>;
}
