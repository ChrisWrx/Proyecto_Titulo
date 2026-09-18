export interface ModeloComparacionMl {
  modelo: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  tiempo_entrenamiento: number;
  tiempo_prediccion: number;
}

export interface ComparacionMlResponse {
  descripcion: string;
  modelos: ModeloComparacionMl[];
  mejor_modelo?: ModeloComparacionMl;
  criterio: string;
}
