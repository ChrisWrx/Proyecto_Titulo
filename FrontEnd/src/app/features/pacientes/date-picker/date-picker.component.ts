import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, input, output, signal } from '@angular/core';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DiaCalendario {
  iso: string;
  numero: number;
  fueraDeMes: boolean;
  hoy: boolean;
  seleccionado: boolean;
  deshabilitado: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatePickerComponent {
  readonly value = input<string>('');
  readonly max = input<string>('');
  readonly invalido = input<boolean>(false);
  readonly compacto = input<boolean>(false);
  readonly valueChange = output<string>();

  readonly abierto = signal(false);
  private readonly mesVisible = signal<Date>(new Date());
  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  readonly texto = computed(() => {
    const [y, m, d] = this.value().slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : 'dd/mm/aaaa';
  });

  readonly nombreMes = computed(() => MESES[this.mesVisible().getMonth()]);
  readonly anioVisible = computed(() => this.mesVisible().getFullYear());
  readonly anios = computed(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, i) => actual + 5 - i);
  });

  readonly dias = computed<DiaCalendario[]>(() => {
    const base = this.mesVisible();
    const anio = base.getFullYear();
    const mes = base.getMonth();
    const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const hoy = this.aIso(new Date());
    const seleccion = this.value().slice(0, 10);
    const maximo = this.max();

    return Array.from({ length: 42 }, (_, i) => {
      const fecha = new Date(anio, mes, 1 - desfase + i);
      const iso = this.aIso(fecha);
      return {
        iso,
        numero: fecha.getDate(),
        fueraDeMes: fecha.getMonth() !== mes,
        hoy: iso === hoy,
        seleccionado: iso === seleccion,
        deshabilitado: !!maximo && iso > maximo
      };
    });
  });

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  cerrarAlClickExterno(event: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(event.target as Node)) {
      this.abierto.set(false);
    }
  }

  @HostListener('keydown.escape')
  cerrarConEscape(): void {
    this.abierto.set(false);
  }

  alternar(): void {
    if (!this.abierto()) {
      const actual = this.value().slice(0, 10);
      this.mesVisible.set(actual ? new Date(`${actual}T00:00:00`) : new Date());
    }
    this.abierto.update(v => !v);
  }

  cambiarMes(delta: number): void {
    const base = this.mesVisible();
    this.mesVisible.set(new Date(base.getFullYear(), base.getMonth() + delta, 1));
  }

  seleccionar(iso: string): void {
    this.valueChange.emit(iso);
    this.abierto.set(false);
  }

  irAHoy(): void {
    this.seleccionar(this.aIso(new Date()));
  }

  cambiarAnio(valor: string): void {
    const base = this.mesVisible();
    this.mesVisible.set(new Date(Number(valor), base.getMonth(), 1));
  }

  private aIso(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
  }
}
