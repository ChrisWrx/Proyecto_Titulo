import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ChurnApiService } from '../../core/services/churn-api.service';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ModeloInfoResponse } from '../../core/models/modelo-info.model';
import { MetricsBaselineResponse } from '../../core/models/metrics-baseline.model';

Chart.register(...registerables);

@Component({
  selector: 'app-predict',
  standalone: true,
  imports: [],
  templateUrl: './predict.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./predict.component.css']
})
export class PredictComponent implements OnInit, OnDestroy {
  modeloInfo: ModeloInfoResponse | null = null;
  baseline: MetricsBaselineResponse | null = null;
  private aucChart: Chart | null = null;

  loading = true;
  error: string | null = null;

  constructor(private apiService: ChurnApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  // Nota: no usamos AfterViewChecked aquí; replicamos el mismo patrón de Métricas
  // (loading=false y luego setTimeout(createCharts, 100)).

  ngOnDestroy(): void {
    if (this.aucChart) {
      this.aucChart.destroy();
      this.aucChart = null;
    }
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    if (this.aucChart) {
      this.aucChart.destroy();
      this.aucChart = null;
    }

    forkJoin({
      modelo: this.apiService.getModeloInfo(),
      baseline: this.apiService.getMetricsBaseline()
    }).subscribe({
      next: ({ modelo, baseline }) => {
        this.modeloInfo = modelo;
        this.baseline = baseline;
        this.loading = false;
        // Mismo efecto que en Métricas: esperar un tick y luego crear el chart.
        setTimeout(() => this.createCharts(), 100);
      },
      error: () => {
        this.error = 'Error al cargar la información del modelo.';
        this.loading = false;
      }
    });
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  getMetric(key: string): number {
    return Number((this.baseline?.metricas ?? {})[key] ?? 0);
  }

  createCharts(): void {
    this.createAucChart();
  }

  private createAucChart(): void {
    const ctx = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (!ctx) return;

    const primary = this.getCssVar('--primary-blue');
    const gray200 = this.getCssVar('--gray-200');

    const auc = this.getMetric('roc_auc');

    this.aucChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['AUC', 'Margen'],
        datasets: [{
          data: [auc * 100, (1 - auc) * 100],
          backgroundColor: [primary, gray200],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Área Bajo la Curva (AUC)',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        }
      }
    });
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}
