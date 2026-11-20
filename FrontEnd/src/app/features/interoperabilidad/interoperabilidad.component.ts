import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AutocompleteComponent, OpcionAutocomplete } from '../pacientes/autocomplete/autocomplete.component';
import {
  DetalleIntegracion,
  EventoIntegracion,
  GuardarIntegracionPayload,
  IntegracionExterna,
  InteroperabilidadApiService,
  OpcionCatalogoInterop,
  PermisosInteroperabilidad,
  RecursoCatalogo,
  RegistroConsultaFhir,
  ResultadoConsultaFhir,
  ResumenIntegraciones
} from '../../core/services/interoperabilidad-api.service';

export type VistaInteroperabilidad = 'recursos-fhir' | 'integraciones';

const FORMULARIO_VACIO = {
  nombre: '',
  descripcion: '',
  tipo: '',
  url_base: '',
  version_fhir: '',
  autenticacion: ''
};

@Component({
  selector: 'app-interoperabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './interoperabilidad.component.html',
  styleUrls: ['./interoperabilidad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteroperabilidadComponent implements OnInit, OnChanges {
  @Input() vistaInicial: VistaInteroperabilidad = 'recursos-fhir';

  readonly opcionesTipo = signal<OpcionAutocomplete[]>([]);
  readonly opcionesAutenticacion = signal<OpcionAutocomplete[]>([]);
  readonly opcionesVersion = signal<OpcionCatalogoInterop[]>([]);

  readonly vista = signal<VistaInteroperabilidad>('recursos-fhir');
  readonly permisos = signal<PermisosInteroperabilidad | null>(null);
  readonly cargandoPermisos = signal(true);

  // Recursos FHIR
  readonly catalogo = signal<RecursoCatalogo[]>([]);
  readonly recursoSeleccionado = signal<RecursoCatalogo | null>(null);
  readonly rutConsulta = signal('');
  readonly consultando = signal(false);
  readonly resultado = signal<ResultadoConsultaFhir | null>(null);
  readonly registroJson = signal<RegistroConsultaFhir | null>(null);
  readonly jsonTexto = computed(() => JSON.stringify(this.registroJson()?.json ?? {}, null, 2));

  // Integraciones
  readonly integraciones = signal<IntegracionExterna[]>([]);
  readonly resumen = signal<ResumenIntegraciones | null>(null);
  readonly historial = signal<EventoIntegracion[]>([]);
  readonly soloErrores = signal(false);
  readonly cargandoIntegraciones = signal(false);
  readonly probando = signal<string | null>(null);
  readonly modalFormAbierto = signal(false);
  readonly integracionEditandoId = signal<string | null>(null);
  readonly formulario = signal({ ...FORMULARIO_VACIO });
  readonly guardando = signal(false);
  readonly detalle = signal<DetalleIntegracion | null>(null);

  readonly puedeEditar = computed(() => !!this.permisos()?.puede_editar);
  readonly puedeVer = computed(() => !!this.permisos()?.puede_ver);

  constructor(private readonly api: InteroperabilidadApiService) {}

  ngOnInit(): void {
    this.vista.set(this.vistaInicial);
    this.api.obtenerPermisos().subscribe({
      next: permisos => {
        this.permisos.set(permisos);
        this.cargandoPermisos.set(false);
        if (permisos.puede_ver) this.cargarVista();
      },
      error: () => {
        this.permisos.set({ rol: null, puede_ver: false, puede_editar: false });
        this.cargandoPermisos.set(false);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vistaInicial'] && !changes['vistaInicial'].firstChange) {
      this.setVista(this.vistaInicial);
    }
  }

  setVista(vista: VistaInteroperabilidad): void {
    this.vista.set(vista);
    if (this.puedeVer()) this.cargarVista();
  }

  private cargarVista(): void {
    if (this.vista() === 'recursos-fhir') {
      if (!this.catalogo().length) this.cargarCatalogo();
    } else {
      this.cargarIntegraciones();
    }
  }

  // ── Recursos FHIR ───────────────────────────────────────────

  private cargarCatalogo(): void {
    this.api.obtenerCatalogoFhir().subscribe({
      next: catalogo => {
        this.catalogo.set(catalogo);
        if (!this.recursoSeleccionado()) this.recursoSeleccionado.set(catalogo[0] ?? null);
      },
      error: err => this.mostrarError(err, 'No fue posible cargar el catálogo de recursos')
    });
  }

  seleccionarRecurso(recurso: RecursoCatalogo): void {
    if (!recurso.soportado) return;
    this.recursoSeleccionado.set(recurso);
    this.resultado.set(null);
    if (this.rutConsulta().trim()) this.consultar();
  }

  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const rutFormateado = this.formatearRut(input.value);
    this.rutConsulta.set(rutFormateado);
    input.value = rutFormateado;
  }

  private formatearRut(valor: string): string {
    const caracteres = valor.toUpperCase().replace(/[^0-9K]/g, '');
    const posicionK = caracteres.indexOf('K');
    const limpio = posicionK >= 0 ? `${caracteres.slice(0, posicionK)}K` : caracteres.slice(0, 9);
    if (!limpio) return '';

    const cuerpo = limpio.slice(0, -1);
    const digitoVerificador = limpio.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return cuerpo ? `${cuerpoFormateado}-${digitoVerificador}` : digitoVerificador;
  }

  consultar(): void {
    const recurso = this.recursoSeleccionado();
    const rut = this.rutConsulta().trim();
    if (!recurso) return;
    if (!rut) {
      Swal.fire({ icon: 'info', title: 'RUT requerido', text: 'Ingresa el RUT del paciente a consultar.', confirmButtonColor: '#0b4aa8' });
      return;
    }

    this.consultando.set(true);
    this.api.consultarRecursoFhir(recurso.recurso, rut).subscribe({
      next: resultado => {
        this.resultado.set(resultado);
        this.consultando.set(false);
      },
      error: err => {
        this.consultando.set(false);
        this.mostrarError(err, 'No fue posible consultar el recurso');
      }
    });
  }

  verJson(registro: RegistroConsultaFhir): void {
    this.registroJson.set(registro);
  }

  cerrarJson(): void {
    this.registroJson.set(null);
  }

  async copiarJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonTexto());
      Swal.fire({ icon: 'success', title: 'JSON copiado', timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo copiar', confirmButtonColor: '#0b4aa8' });
    }
  }

  // ── Integraciones ───────────────────────────────────────────

  cargarIntegraciones(): void {
    this.cargandoIntegraciones.set(true);
    this.api.listarIntegraciones().subscribe({
      next: lista => {
        this.integraciones.set(lista);
        this.cargandoIntegraciones.set(false);
      },
      error: err => {
        this.cargandoIntegraciones.set(false);
        this.mostrarError(err, 'No fue posible cargar las integraciones');
      }
    });
    this.api.resumenIntegraciones().subscribe({ next: resumen => this.resumen.set(resumen) });
    this.api.obtenerTiposIntegracion().subscribe({ next: tipos => this.opcionesTipo.set(tipos) });
    this.api.obtenerAutenticaciones().subscribe({ next: auth => this.opcionesAutenticacion.set(auth) });
    this.api.obtenerVersionesFhir().subscribe({ next: versiones => this.opcionesVersion.set(versiones) });
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.api.historial(this.soloErrores()).subscribe({ next: eventos => this.historial.set(eventos) });
  }

  toggleSoloErrores(): void {
    this.soloErrores.update(valor => !valor);
    this.cargarHistorial();
  }

  abrirFormulario(integracion?: IntegracionExterna): void {
    this.integracionEditandoId.set(integracion?.id_integracion ?? null);
    this.formulario.set(
      integracion
        ? {
            nombre: integracion.nombre,
            descripcion: integracion.descripcion ?? '',
            tipo: integracion.tipo,
            url_base: integracion.url_base,
            version_fhir: integracion.version_fhir,
            autenticacion: integracion.autenticacion
          }
        : {
            ...FORMULARIO_VACIO,
            tipo: this.opcionesTipo()[0]?.id ?? '',
            autenticacion: this.opcionesAutenticacion()[0]?.id ?? '',
            version_fhir: (this.opcionesVersion().find(v => v.predeterminado) ?? this.opcionesVersion()[0])?.id ?? ''
          }
    );
    this.modalFormAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.modalFormAbierto.set(false);
  }

  actualizarCampo(campo: keyof typeof FORMULARIO_VACIO, event: Event): void {
    const valor = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.formulario.update(form => ({ ...form, [campo]: valor }));
  }

  actualizarValor(campo: keyof typeof FORMULARIO_VACIO, valor: string): void {
    this.formulario.update(form => ({ ...form, [campo]: valor }));
  }

  guardarIntegracion(): void {
    const form = this.formulario();
    if (!form.nombre.trim() || !form.url_base.trim() || !form.tipo || !form.autenticacion) {
      Swal.fire({ icon: 'info', title: 'Datos incompletos', text: 'Nombre, URL base, tipo, versión FHIR y autenticación son obligatorios.', confirmButtonColor: '#0b4aa8' });
      return;
    }

    const payload: GuardarIntegracionPayload = { ...form };
    this.guardando.set(true);
    this.api.guardarIntegracion(payload, this.integracionEditandoId() ?? undefined).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalFormAbierto.set(false);
        this.cargarIntegraciones();
        Swal.fire({ icon: 'success', title: 'Integración guardada', timer: 1400, showConfirmButton: false });
      },
      error: err => {
        this.guardando.set(false);
        this.mostrarError(err, 'No fue posible guardar la integración');
      }
    });
  }

  alternarHabilitada(integracion: IntegracionExterna): void {
    const habilitada = !integracion.habilitada;
    this.api.habilitarIntegracion(integracion.id_integracion, habilitada).subscribe({
      next: () => {
        this.integraciones.update(lista =>
          lista.map(item => (item.id_integracion === integracion.id_integracion ? { ...item, habilitada } : item))
        );
        this.api.resumenIntegraciones().subscribe({ next: resumen => this.resumen.set(resumen) });
      },
      error: err => this.mostrarError(err, 'No fue posible cambiar el estado')
    });
  }

  probar(integracion: IntegracionExterna): void {
    this.probando.set(integracion.id_integracion);
    this.api.probarIntegracion(integracion.id_integracion).subscribe({
      next: resultado => {
        this.probando.set(null);
        this.cargarIntegraciones();
        Swal.fire({
          icon: resultado.exito ? 'success' : 'error',
          title: resultado.exito ? 'Prueba exitosa' : 'Prueba fallida',
          text: `${resultado.mensaje} (${resultado.latencia_ms} ms)`,
          confirmButtonColor: '#0b4aa8'
        });
      },
      error: err => {
        this.probando.set(null);
        this.mostrarError(err, 'No fue posible probar la conexión');
      }
    });
  }

  verDetalle(integracion: IntegracionExterna): void {
    this.api.detalleIntegracion(integracion.id_integracion).subscribe({
      next: detalle => this.detalle.set(detalle),
      error: err => this.mostrarError(err, 'No fue posible cargar el detalle')
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  // ── Presentación ─────────────────────────────────────────────

  etiquetaTipo(tipo: string): string {
    return this.opcionesTipo().find(t => t.id === tipo)?.nombre ?? tipo;
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      CONECTADO: 'Conectado',
      ALCANZABLE: 'Alcanzable',
      ERROR: 'Con error',
      SIN_VERIFICAR: 'Sin verificar'
    };
    return etiquetas[estado] ?? estado;
  }

  formatFecha(fecha: string | null): string {
    if (!fecha) return '—';
    const d = new Date(fecha.endsWith('Z') ? fecha : `${fecha}Z`);
    return isNaN(d.getTime()) ? fecha : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }

  private mostrarError(err: unknown, mensajePorDefecto: string): void {
    const http = err as HttpErrorResponse;
    const detalle = http?.error?.message;
    Swal.fire({
      icon: 'error',
      title: http?.status === 403 ? 'Acceso restringido' : 'Error',
      text: Array.isArray(detalle) ? detalle.join(', ') : (detalle ?? mensajePorDefecto),
      confirmButtonColor: '#0b4aa8'
    });
  }
}
