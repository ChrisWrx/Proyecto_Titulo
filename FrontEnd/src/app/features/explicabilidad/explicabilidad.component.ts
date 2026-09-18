import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ChurnApiService } from '../../core/services/churn-api.service';
import { ShapGlobalResponse } from '../../core/models/shap-global.model';

Chart.register(...registerables);

@Component({
  selector: 'app-explicabilidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explicabilidad.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./explicabilidad.component.css']
})
export class ExplicabilidadComponent implements OnInit {
  shap: ShapGlobalResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor(private apiService: ChurnApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.apiService.getShapGlobal().subscribe({
      next: (data) => {
        this.shap = data;
        this.loading = false;
        setTimeout(() => this.createTopChart(), 100);
      },
      error: () => {
        this.error = 'Error al cargar la explicabilidad (SHAP)';
        this.loading = false;
      }
    });
  }

  private createTopChart(): void {
    const ctx = document.getElementById('shapTopChart') as HTMLCanvasElement;
    if (!ctx || !this.shap) return;

    const primary = this.getCssVar('--primary-blue');
    const light = this.getCssVar('--primary-blue-light');
    const dark = this.getCssVar('--primary-blue-dark');

    const top = Array.isArray(this.shap.top_5) ? this.shap.top_5 : [];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(f => f.feature),
        datasets: [{
          label: 'Importancia',
          data: top.map(f => f.importance),
          backgroundColor: [primary, light, dark, light, primary],
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
            text: 'Top 5 Variables Más Influyentes (SHAP)',
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: false }
        }
      }
    });
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}
