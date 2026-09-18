import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChurnApiService } from '../../core/services/churn-api.service';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ComparacionMlResponse, ModeloComparacionMl } from '../../core/models/comparacion-ml.model';
import { ComparacionDlResponse, ArquitecturaComparacionDl } from '../../core/models/comparacion-dl.model';
import { ComparacionBalanceoResponse, TecnicaBalanceo } from '../../core/models/comparacion-balanceo.model';

Chart.register(...registerables);

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./comparison.component.css']
})
export class ComparisonComponent implements OnInit {
  mlModels: ComparisonItem[] = [];
  dlArchitectures: DlItem[] = [];
  balanceoTecnicas: BalanceoItem[] = [];

  mlDescripcion = '';
  dlDescripcion = '';
  balanceoDescripcion = '';

  loading = true;
  error: string | null = null;

  constructor(private apiService: ChurnApiService) {}

  ngOnInit(): void {
    this.loadComparison();
  }

  loadComparison(): void {
    this.loading = true;

    forkJoin({
      ml: this.apiService.getComparacionMl(),
      dl: this.apiService.getComparacionDl(),
      balanceo: this.apiService.getComparacionBalanceo()
    }).subscribe({
      next: ({ ml, dl, balanceo }) => {
        this.mlDescripcion = ml.descripcion;
        this.dlDescripcion = dl.descripcion;
        this.balanceoDescripcion = balanceo.descripcion;

        this.mlModels = (ml.modelos ?? []).map(this.mapMlModel);
        this.dlArchitectures = (dl.arquitecturas ?? []).map(this.mapDlArchitecture);
        this.balanceoTecnicas = (balanceo.tecnicas ?? []).map(this.mapBalanceoTecnica);

        this.loading = false;
        setTimeout(() => this.createCharts(), 100);
      },
      error: () => {
        this.error = 'Error al cargar la comparación de modelos';
        this.loading = false;
      }
    });
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  private mapMlModel = (m: ModeloComparacionMl): ComparisonItem => ({
    name: m.modelo,
    accuracy: m.accuracy,
    precision: m.precision,
    recall: m.recall,
    f1: m.f1_score,
    auc: m.roc_auc
  });

  private mapDlArchitecture = (a: ArquitecturaComparacionDl): DlItem => ({
    modelo: a.modelo,
    accuracy: a.accuracy,
    precision: a.precision,
    recall: a.recall,
    f1_score: a.f1_score,
    roc_auc: a.roc_auc,
    parametros_totales: a.parametros_totales
  });

  private mapBalanceoTecnica = (t: TecnicaBalanceo): BalanceoItem => ({
    tecnica: t.tecnica,
    ratio_balanceo: t.ratio_balanceo,
    accuracy: t.accuracy,
    precision: t.precision,
    recall: t.recall,
    f1_score: t.f1_score,
    roc_auc: t.roc_auc,
    tiempo_entrenamiento: t.tiempo_entrenamiento
  });

  createCharts(): void {
    this.createMlComparisonBarChart();
    this.createMlRadarChart();
    this.createMlRocCurve();
    this.createDlBarChart();
    this.createBalanceoBarChart();
  }

  createMlComparisonBarChart(): void {
    const ctx = document.getElementById('comparisonBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');
    const palette = [primary, light, dark, light, primary];

    const metrics = ['accuracy', 'precision', 'recall', 'f1', 'auc'];
    const datasets = metrics.map((metric, index) => {
      return {
        label: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: this.mlModels.map(m => (m[metric as keyof ComparisonItem] as number) * 100),
        backgroundColor: palette[index % palette.length],
        borderWidth: 0,
        borderRadius: 6
      };
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.mlModels.map(m => m.name),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Comparación Completa de Métricas',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom'
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

  createMlRadarChart(): void {
    const ctx = document.getElementById('radarComparisonChart') as HTMLCanvasElement;
    if (!ctx) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');
    const palette = [primary, light, dark, light];

    const labels = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'AUC'];
    
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: this.mlModels.map((model, index) => {
          const border = palette[index % palette.length];
          const bg = this.hexToRgba(border, 0.2);
          return {
            label: model.name,
            data: [
              model.accuracy * 100,
              model.precision * 100,
              model.recall * 100,
              model.f1 * 100,
              model.auc * 100
            ],
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 2,
            pointBackgroundColor: border,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: border
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Radar Chart - Comparación de Modelos',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              callback: function(value: any) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  createMlRocCurve(): void {
    const ctx = document.getElementById('rocCurveChart') as HTMLCanvasElement;
    if (!ctx) return;

    const rocData = this.mlModels.map(model => {
      const points = 100;
      const data = [];
      for (let i = 0; i <= points; i++) {
        const fpr = i / points;
        const tpr = Math.pow(fpr, 1 / (2 - model.auc));
        data.push({ x: fpr, y: tpr });
      }
      return { name: model.name, data: data, auc: model.auc };
    });

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');
    const gray200 = this.getCssVar('--gray-200');
    const colors = [primary, light, dark, light];

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          ...rocData.map((model, index) => ({
            label: `${model.name} (AUC: ${(model.auc * 100).toFixed(2)}%)`,
            data: model.data,
            borderColor: colors[index],
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.4
          })),
          {
            label: 'Línea Base (AUC: 50%)',
            data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            borderColor: gray200,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [10, 5],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Curvas ROC - Comparación de Modelos',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'False Positive Rate (FPR)',
              font: {
                weight: 'bold'
              }
            },
            min: 0,
            max: 1
          },
          y: {
            title: {
              display: true,
              text: 'True Positive Rate (TPR)',
              font: {
                weight: 'bold'
              }
            },
            min: 0,
            max: 1
          }
        }
      }
    });
  }

  createDlBarChart(): void {
    const ctx = document.getElementById('dlBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');
    const palette = [primary, light, dark, light];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dlArchitectures.map(a => a.modelo),
        datasets: [{
          label: 'F1-Score',
          data: this.dlArchitectures.map(a => a.f1_score * 100),
          backgroundColor: this.dlArchitectures.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Deep Learning - F1-Score por Arquitectura',
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: false }
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

  createBalanceoBarChart(): void {
    const ctx = document.getElementById('balanceoBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');
    const palette = [primary, light, dark, light];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.balanceoTecnicas.map(t => t.tecnica),
        datasets: [{
          label: 'F1-Score',
          data: this.balanceoTecnicas.map(t => t.f1_score * 100),
          backgroundColor: this.balanceoTecnicas.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Balanceo - F1-Score por Técnica',
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: false }
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

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '').trim();
    if (normalized.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(normalized.substring(0, 2), 16);
    const g = parseInt(normalized.substring(2, 4), 16);
    const b = parseInt(normalized.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

interface ComparisonItem {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}

interface DlItem {
  modelo: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  parametros_totales: number;
}

interface BalanceoItem {
  tecnica: string;
  ratio_balanceo: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  tiempo_entrenamiento: number;
}
