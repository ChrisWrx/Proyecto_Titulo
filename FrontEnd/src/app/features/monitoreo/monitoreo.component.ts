import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ChurnApiService } from '../../core/services/churn-api.service';
import {
  AlertsResponse,
  DriftCheckResponse,
  DriftHistoryResponse,
  MonitoringStatusResponse
} from '../../core/models/monitoring.model';

@Component({
  selector: 'app-monitoreo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitoreo.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./monitoreo.component.css']
})
export class MonitoreoComponent implements OnInit {
  status: MonitoringStatusResponse | null = null;
  drift: DriftCheckResponse | null = null;
  history: DriftHistoryResponse | null = null;
  alerts: AlertsResponse | null = null;

  loading = true;
  error: string | null = null;

  constructor(private apiService: ChurnApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      status: this.apiService.getMonitoringStatus(),
      drift: this.apiService.checkDrift(),
      history: this.apiService.getDriftHistory(30),
      alerts: this.apiService.getAlerts(true)
    }).subscribe({
      next: ({ status, drift, history, alerts }) => {
        this.status = status;
        this.drift = drift;
        this.history = history;
        this.alerts = alerts;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar el monitoreo';
        this.loading = false;
      }
    });
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }
}
