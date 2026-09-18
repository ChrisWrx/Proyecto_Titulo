export interface ComparisonItem {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}

export interface ComparisonResponse {
  neural_network: ComparisonItem;
  logistic_regression: ComparisonItem;
  random_forest: ComparisonItem;
  xgBoost: ComparisonItem;
}

export function comparisonToArray(response: ComparisonResponse): ComparisonItem[] {
  return [
    response.logistic_regression,
    response.neural_network,
    response.random_forest,
    response.xgBoost
  ];
}
