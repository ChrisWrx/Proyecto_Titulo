export interface ShapFeature {
  feature: string;
  importance: number;
}

export interface ShapGlobalResponse {
  descripcion: string;
  features: ShapFeature[];
  total_features: number;
  top_5: ShapFeature[];
}
