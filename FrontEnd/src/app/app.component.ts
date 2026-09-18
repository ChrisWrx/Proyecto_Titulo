import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Proyecto de Predicción de Churn';
}
