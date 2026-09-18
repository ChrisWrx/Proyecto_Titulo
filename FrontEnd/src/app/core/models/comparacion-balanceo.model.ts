export interface TecnicaBalanceo {
  tecnica: string;
  instancias_train: number;
  clase_0_train: number;
  clase_1_train: number;
  ratio_balanceo: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  tiempo_entrenamiento: number;
}

export interface ComparacionBalanceoResponse {
  descripcion: string;
  tecnicas: TecnicaBalanceo[];
  mejor_tecnica?: TecnicaBalanceo;
  criterio: string;
}
