export interface ArquitecturaComparacionDl {
  modelo: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  parametros_totales: number;
}

export interface ComparacionDlResponse {
  descripcion: string;
  arquitecturas: ArquitecturaComparacionDl[];
  mejor_arquitectura?: ArquitecturaComparacionDl;
  criterio: string;
}
