import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ChurnApiService } from '../../core/services/churn-api.service';
import { MetricsBaselineResponse } from '../../core/models/metrics-baseline.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [],
  templateUrl: './metrics.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./metrics.component.css']
})
export class MetricsComponent implements OnInit {
  metrics: MetricsBaselineResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor(private apiService: ChurnApiService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading = true;
    this.apiService.getMetricsBaseline().subscribe({
      next: (data: MetricsBaselineResponse) => {
        this.metrics = data;
        this.loading = false;
        setTimeout(() => this.createCharts(), 100);
      },
      error: (err: Error) => {
        this.error = 'Error al cargar las métricas del modelo';
        this.loading = false;
      }
    });
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  getMetric(key: string): number {
    return Number((this.metrics?.metricas ?? {})[key] ?? 0);
  }

  createCharts(): void {
    if (!this.metrics) return;
    this.createMetricsBarChart();
    this.createDoughnutChart();
  }

  createMetricsBarChart(): void {
    const ctx = document.getElementById('metricsBarChart') as HTMLCanvasElement;
    if (!ctx || !this.metrics) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');

    const metricas = this.metrics.metricas ?? {};
    const accuracy = Number(metricas['accuracy'] ?? 0);
    const precision = Number(metricas['precision'] ?? 0);
    const recall = Number(metricas['recall'] ?? 0);
    const f1 = Number(metricas['f1_score'] ?? 0);
    const auc = Number(metricas['roc_auc'] ?? 0);

    const data = [accuracy * 100, precision * 100, recall * 100, f1 * 100, auc * 100];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'AUC'],
        datasets: [{
          label: 'Métricas (%)',
          data: data,
          backgroundColor: [
            primary,
            light,
            dark,
            light,
            primary
          ],
          borderWidth: 0,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Desempeño del Modelo: ' + this.metrics.modelo,
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value: any) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  createDoughnutChart(): void {
    const ctx = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (!ctx || !this.metrics) return;

    const primary = this.getCssVar('--primary-blue');
    const gray200 = this.getCssVar('--gray-200');

    const auc = Number((this.metrics.metricas ?? {})['roc_auc'] ?? 0);

    new Chart(ctx, {
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
          legend: {
            display: false
          },
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
