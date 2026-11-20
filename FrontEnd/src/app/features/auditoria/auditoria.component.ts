import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  AuditoriaApiService,
  DetalleEventoAuditoria,
  EventoAuditoria,
  FiltrosAuditoria,
  IndicadoresAuditoria,
  OpcionAuditoria,
  PermisosAuditoria,
  RetencionAuditoria
} from '../../core/services/auditoria-api.service';
import { AutocompleteComponent } from '../pacientes/autocomplete/autocomplete.component';
import { DatePickerComponent } from '../pacientes/date-picker/date-picker.component';

type ClaveFiltro = 'desde' | 'hasta' | 'modulo' | 'accion' | 'id_usuario' | 'rol' | 'resultado';

const FILTROS_VACIOS: Record<ClaveFiltro, string> = {
  desde: '',
  hasta: '',
  modulo: '',
  accion: '',
  id_usuario: '',
  rol: '',
  resultado: ''
};

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, AutocompleteComponent, DatePickerComponent],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditoriaComponent implements OnInit {
  readonly PAGE_SIZE = 7;

  readonly permisos = signal<PermisosAuditoria | null>(null);
  readonly cargandoPermisos = signal(true);
  readonly indicadores = signal<IndicadoresAuditoria | null>(null);
  readonly retencion = signal<RetencionAuditoria | null>(null);

  readonly filtros = signal<Record<ClaveFiltro, string>>({ ...FILTROS_VACIOS });
  readonly hoyIso = new Date().toISOString().slice(0, 10);

  readonly opcionesModulo = signal<OpcionAuditoria[]>([]);
  readonly opcionesAccion = signal<OpcionAuditoria[]>([]);
  readonly opcionesUsuario = signal<OpcionAuditoria[]>([]);
  readonly opcionesRol = signal<OpcionAuditoria[]>([]);
  readonly opcionesResultado = signal<OpcionAuditoria[]>([]);

  readonly eventos = signal<EventoAuditoria[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly cargando = signal(false);
  readonly exportando = signal(false);
  readonly detalle = signal<DetalleEventoAuditoria | null>(null);

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));
  readonly puedeVer = computed(() => !!this.permisos()?.puede_ver);
  readonly puedeExportar = computed(() => !!this.permisos()?.puede_exportar);
  readonly hayFiltros = computed(() => Object.values(this.filtros()).some(valor => !!valor));

  constructor(private readonly api: AuditoriaApiService) {}

  ngOnInit(): void {
    this.api.obtenerPermisos().subscribe({
      next: permisos => {
        this.permisos.set(permisos);
        this.cargandoPermisos.set(false);
        if (permisos.puede_ver) this.cargarTodo();
      },
      error: () => {
        this.permisos.set({ rol: null, puede_ver: false, puede_exportar: false, puede_configurar: false });
        this.cargandoPermisos.set(false);
      }
    });
  }

  private cargarTodo(): void {
    this.api.obtenerIndicadores().subscribe({ next: datos => this.indicadores.set(datos) });
    this.api.obtenerRetencion().subscribe({ next: datos => this.retencion.set(datos) });
    this.api.catalogoModulos().subscribe({ next: lista => this.opcionesModulo.set(lista) });
    this.api.catalogoAcciones().subscribe({ next: lista => this.opcionesAccion.set(lista) });
    this.api.catalogoUsuarios().subscribe({ next: lista => this.opcionesUsuario.set(lista) });
    this.api.catalogoRoles().subscribe({ next: lista => this.opcionesRol.set(lista) });
    this.api.catalogoResultados().subscribe({ next: lista => this.opcionesResultado.set(lista) });
    this.buscar(1);
  }

  // ── Filtros ─────────────────────────────────────────────────

  actualizarFiltro(clave: ClaveFiltro, valor: string): void {
    this.filtros.update(actual => ({ ...actual, [clave]: valor }));
  }

  // Al cambiar de módulo, las acciones disponibles se limitan a ese módulo.
  cambiarModulo(modulo: string): void {
    this.filtros.update(actual => ({ ...actual, modulo, accion: '' }));
    this.api.catalogoAcciones(modulo || undefined).subscribe({ next: lista => this.opcionesAccion.set(lista) });
  }

  limpiarFiltros(): void {
    this.filtros.set({ ...FILTROS_VACIOS });
    this.api.catalogoAcciones().subscribe({ next: lista => this.opcionesAccion.set(lista) });
    this.buscar(1);
  }

  private filtrosConsulta(): FiltrosAuditoria {
    return { ...this.filtros() };
  }

  // ── Consulta y paginación ───────────────────────────────────

  buscar(pagina = 1): void {
    const desde = this.filtros().desde;
    const hasta = this.filtros().hasta;
    if (desde && hasta && desde > hasta) {
      Swal.fire({ icon: 'info', title: 'Rango de fechas inválido', text: 'La fecha desde no puede ser posterior a la fecha hasta.', confirmButtonColor: '#0b4aa8' });
      return;
    }

    this.cargando.set(true);
    this.api.listarEventos({ ...this.filtrosConsulta(), pagina, tamano: this.PAGE_SIZE }).subscribe({
      next: resultado => {
        this.eventos.set(resultado.filas);
        this.total.set(resultado.total);
        this.pagina.set(resultado.pagina);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.mostrarError(err, 'No fue posible consultar la auditoría');
      }
    });
    this.api.obtenerIndicadores().subscribe({ next: datos => this.indicadores.set(datos) });
  }

  irAPagina(pagina: number): void {
    const destino = Math.min(Math.max(1, pagina), this.totalPaginas());
    if (destino !== this.pagina()) this.buscar(destino);
  }

  // ── Detalle ─────────────────────────────────────────────────

  verDetalle(evento: EventoAuditoria): void {
    this.api.obtenerEvento(evento.id_auditoria).subscribe({
      next: detalle => this.detalle.set(detalle),
      error: err => this.mostrarError(err, 'No fue posible cargar el detalle')
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  // ── Exportación ─────────────────────────────────────────────

  exportar(): void {
    this.exportando.set(true);
    this.api.exportarEventos(this.filtrosConsulta()).subscribe({
      next: resultado => {
        this.exportando.set(false);
        this.descargarCsv(resultado.filas);
        this.api.obtenerIndicadores().subscribe({ next: datos => this.indicadores.set(datos) });
        if (resultado.total > resultado.filas.length) {
          Swal.fire({ icon: 'info', title: 'Exportación parcial', text: `Se exportaron ${resultado.filas.length} de ${resultado.total} eventos. Aplica filtros para acotar el resultado.`, confirmButtonColor: '#0b4aa8' });
        }
      },
      error: err => {
        this.exportando.set(false);
        this.mostrarError(err, 'No fue posible exportar la auditoría');
      }
    });
  }

  private descargarCsv(filas: EventoAuditoria[]): void {
    const encabezado = ['Fecha', 'Usuario', 'Rol', 'Módulo', 'Acción', 'Recurso', 'RUT', 'Referencia', 'Origen', 'IP de origen', 'Resultado', 'Detalle'];
    const lineas = filas.map(f => [
      this.formatFecha(f.fecha), f.usuario, f.rol, f.modulo, f.accion, f.recurso, f.rut_enmascarado, f.referencia, f.origen, f.ip_origen,
      f.exito ? 'Exitoso' : 'Fallido', f.mensaje
    ].map(valor => this.celdaCsv(valor)).join(';'));

    const contenido = '\ufeff' + [encabezado.join(';'), ...lineas].join('\r\n');
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `auditoria_accesos_${this.hoyIso.replace(/-/g, '')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // Escapa comillas y neutraliza fórmulas (=, +, -, @) para evitar inyección en planillas.
  private celdaCsv(valor: string | null | undefined): string {
    let texto = (valor ?? '').toString();
    if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
  }

  // ── Presentación ────────────────────────────────────────────

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
