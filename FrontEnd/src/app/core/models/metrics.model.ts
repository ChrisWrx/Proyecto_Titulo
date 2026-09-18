export interface MetricsResponse {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}
