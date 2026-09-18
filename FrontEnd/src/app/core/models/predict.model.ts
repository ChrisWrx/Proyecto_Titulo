export interface PredictResponse {
  churn_probability: number;
  churn_label: ChurnLabel;
}

export type ChurnLabel = 'Low' | 'Medium' | 'High';

export interface PredictInterpretation {
  risk: ChurnLabel;
  color: string;
  icon: string;
  recommendation: string;
}

export function interpretPrediction(response: PredictResponse): PredictInterpretation {
  const label = response.churn_label;
  const probability = response.churn_probability;

  const interpretations: Record<ChurnLabel, PredictInterpretation> = {
    'Low': {
      risk: 'Low',
      color: '#4CAF50',
      icon: 'bi-check-circle-fill',
      recommendation: 'Cliente estable con baja probabilidad de abandono. Mantener estrategias de retención actuales.'
    },
    'Medium': {
      risk: 'Medium',
      color: '#FF9800',
      icon: 'bi-exclamation-triangle-fill',
      recommendation: 'Cliente con riesgo moderado. Implementar acciones preventivas y monitoreo cercano.'
    },
    'High': {
      risk: 'High',
      color: '#F44336',
      icon: 'bi-x-circle-fill',
      recommendation: 'Cliente con alto riesgo de abandono. Activar plan de retención urgente con incentivos especiales.'
    }
  };

  return interpretations[label];
}
