import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, input, output, signal, untracked } from '@angular/core';

export interface OpcionAutocomplete {
  id: string;
  nombre: string;
}

const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutocompleteComponent {
  readonly options = input<OpcionAutocomplete[]>([]);
  readonly value = input<string>('');
  readonly placeholder = input<string>('Selecciona una opción');
  readonly emptyLabel = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalido = input<boolean>(false);
  readonly valueChange = output<string>();

  readonly texto = signal('');
  readonly abierto = signal(false);
  private readonly mostrarTodo = signal(false);
  private escribiendo = false;

  private readonly opcionesTotales = computed<OpcionAutocomplete[]>(() =>
    this.emptyLabel() ? [{ id: '', nombre: this.emptyLabel() }, ...this.options()] : this.options()
  );

  readonly filtradas = computed(() => {
    const opciones = this.opcionesTotales();
    if (this.mostrarTodo()) return opciones;
    const buscado = normalizar(this.texto());
    return buscado ? opciones.filter(o => normalizar(o.nombre).includes(buscado)) : opciones;
  });

  constructor(private readonly host: ElementRef<HTMLElement>) {
    effect(() => {
      const seleccionada = this.opcionesTotales().find(o => o.id === this.value());
      untracked(() => {
        if (this.escribiendo) return;
        this.texto.set(seleccionada ? seleccionada.nombre : '');
      });
    });
  }

  @HostListener('document:click', ['$event'])
  cerrarAlClickExterno(event: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(event.target as Node)) {
      this.cerrar();
    }
  }

  alternar(event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const abrir = !this.abierto();
    this.mostrarTodo.set(abrir);
    this.abierto.set(abrir);
  }

  alEscribir(valor: string): void {
    this.escribiendo = true;
    this.texto.set(valor);
    this.mostrarTodo.set(false);
    this.abierto.set(true);

    const exacta = this.opcionesTotales().find(o => normalizar(o.nombre) === normalizar(valor));
    this.valueChange.emit(exacta ? exacta.id : '');
  }

  alEnter(event: Event): void {
    event.preventDefault();
    const primera = this.filtradas()[0];
    if (primera) this.seleccionar(primera);
  }

  alSalir(): void {
    window.setTimeout(() => this.cerrar(), 120);
  }

  seleccionar(opcion: OpcionAutocomplete): void {
    this.escribiendo = false;
    this.texto.set(opcion.nombre);
    this.mostrarTodo.set(false);
    this.abierto.set(false);
    this.valueChange.emit(opcion.id);
  }

  cerrar(): void {
    this.abierto.set(false);
    this.mostrarTodo.set(false);
    this.escribiendo = false;
    const seleccionada = this.opcionesTotales().find(o => o.id === this.value());
    this.texto.set(seleccionada ? seleccionada.nombre : '');
  }
}
