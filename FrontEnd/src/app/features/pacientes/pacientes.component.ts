import { Component, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CatalogosNuevaAtencion,
  ContextoUsuarioAtencion,
  DetalleObservacionClinica,
  DetalleDerivacionAtencion,
  DetalleRegistroClinico,
  DiagnosticoPdfReport,
  FichaClinicaAtencion,
  GestionClinicaApiService,
  ObservacionCatalogo,
  OpcionCatalogo,
  PacienteSearchResult,
  RecursoFichaItem,
  TipoRegistroHistorial
} from '../../core/services/gestion-clinica-api.service';
import Swal from 'sweetalert2';
import { AutocompleteComponent, OpcionAutocomplete } from './autocomplete/autocomplete.component';
import { DatePickerComponent } from './date-picker/date-picker.component';

interface EstadoHistorial {
  rut: string;
  busquedaRealizada: boolean;
  paciente: PacienteSearchResult | null;
  items: any[];
  slide: number;
  direccion: 'siguiente' | 'anterior';
}

const historialVacio = (): EstadoHistorial => ({
  rut: '',
  busquedaRealizada: false,
  paciente: null,
  items: [],
  slide: 1,
  direccion: 'siguiente'
});

export const CONFIG_HISTORIAL: Record<TipoRegistroHistorial, {
  titulo: string;
  subtitulo: string;
  icono: string;
  iconoItem: string;
  unidad: string;
  seccion: string;
  vacio: string;
  detalle: string;
}> = {
  diagnosticos: {
    titulo: 'Historial de diagnósticos',
    subtitulo: 'Consulta los diagnósticos registrados del paciente.',
    icono: 'bi-heart-pulse',
    iconoItem: 'bi-heart-pulse',
    unidad: 'diagnósticos',
    seccion: 'Diagnósticos asociados',
    vacio: 'Este paciente no tiene diagnósticos registrados.',
    detalle: 'Detalle de diagnóstico'
  },
  alergias: {
    titulo: 'Historial de alergias',
    subtitulo: 'Consulta las alergias registradas del paciente.',
    icono: 'bi-shield-fill-exclamation',
    iconoItem: 'bi-shield-exclamation',
    unidad: 'alergias',
    seccion: 'Alergias registradas',
    vacio: 'Este paciente no tiene alergias registradas.',
    detalle: 'Detalle de alergia'
  },
  medicamentos: {
    titulo: 'Historial de medicamentos',
    subtitulo: 'Consulta los medicamentos indicados al paciente.',
    icono: 'bi-capsule-pill',
    iconoItem: 'bi-capsule',
    unidad: 'medicamentos',
    seccion: 'Medicamentos asociados',
    vacio: 'Este paciente no tiene medicamentos registrados.',
    detalle: 'Detalle de medicamento'
  },
  examenes: {
    titulo: 'Historial de exámenes',
    subtitulo: 'Consulta los exámenes realizados al paciente.',
    icono: 'bi-clipboard2-check-fill',
    iconoItem: 'bi-clipboard2-pulse',
    unidad: 'exámenes',
    seccion: 'Exámenes asociados',
    vacio: 'Este paciente no tiene exámenes registrados.',
    detalle: 'Detalle de examen'
  }
};

export type TabClinica = 'pacientes' | 'atenciones' | 'diagnosticos' | 'alergias' | 'medicamentos' | 'examenes' | 'observaciones';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, AutocompleteComponent],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacientesComponent implements OnChanges {
  readonly ATENCIONES_PAGE_SIZE = 5;
  readonly MODAL_PAGE_SIZE = 5;
  readonly OBSERVACIONES_SLIDE_SIZE = 2;
  readonly LIMITE_TOTAL_OBSERVACIONES = 100_000;

  @Input() tabInicial: TabClinica = 'pacientes';
  @Input() pestanasPermitidas: TabClinica[] | null = null;

  rutInput = signal('');
  tabActiva = signal<TabClinica>('pacientes');

  readonly paginaAtenciones = signal(1);

  cargando = signal(false);
  busquedaRealizada = signal(false);
  paciente = signal<PacienteSearchResult | null>(null);

  readonly atenciones = signal<any[]>([]);
  readonly filtroRutAtenciones = signal('');
  readonly observaciones = signal<any[]>([]);
  readonly cargandoTab = signal(false);
  readonly rutObservaciones = signal('');
  readonly busquedaObservacionesRealizada = signal(false);
  readonly pacienteObservaciones = signal<PacienteSearchResult | null>(null);
  readonly slideObservaciones = signal(1);
  readonly direccionSlideObservaciones = signal<'siguiente' | 'anterior'>('siguiente');
  readonly modalObservacionAbierto = signal(false);
  readonly detalleObservacionCargando = signal(false);
  readonly detalleObservacion = signal<DetalleObservacionClinica | null>(null);
  readonly indicadorObservacionesActualizado = signal(false);
  readonly totalObservacionesMostrado = computed(() =>
    this.observaciones().length > this.LIMITE_TOTAL_OBSERVACIONES
      ? '+100.000'
      : this.observaciones().length.toLocaleString('es-CL')
  );
  readonly observacionesVistas = computed(() =>
    Math.min(this.slideObservaciones() * this.OBSERVACIONES_SLIDE_SIZE, this.observaciones().length)
  );
  readonly progresoObservaciones = computed(() => {
    const total = this.observaciones().length;
    return total ? (this.observacionesVistas() / total) * 100 : 0;
  });
  readonly totalSlidesObservaciones = computed(() =>
    Math.max(1, Math.ceil(this.observaciones().length / this.OBSERVACIONES_SLIDE_SIZE))
  );
  readonly observacionesSlide = computed(() => {
    const inicio = (this.slideObservaciones() - 1) * this.OBSERVACIONES_SLIDE_SIZE;
    return this.observaciones()
      .slice(inicio, inicio + this.OBSERVACIONES_SLIDE_SIZE)
      .map(item => ({
        ...item,
        id_registro: item.id_registro || item.id_observacion || item.id
      }));
  });

  readonly configHistorial = CONFIG_HISTORIAL;
  readonly historiales = signal<Record<TipoRegistroHistorial, EstadoHistorial>>({
    diagnosticos: historialVacio(),
    alergias: historialVacio(),
    medicamentos: historialVacio(),
    examenes: historialVacio()
  });
  readonly tabHistorial = computed<TipoRegistroHistorial | null>(() => {
    const tab = this.tabActiva();
    return tab in CONFIG_HISTORIAL ? (tab as TipoRegistroHistorial) : null;
  });
  readonly historialActivo = computed(() => {
    const tab = this.tabHistorial();
    return tab ? this.historiales()[tab] : null;
  });
  readonly totalHistorialMostrado = computed(() => {
    const total = this.historialActivo()?.items.length ?? 0;
    return total > this.LIMITE_TOTAL_OBSERVACIONES ? '+100.000' : total.toLocaleString('es-CL');
  });
  readonly historialVistas = computed(() => {
    const estado = this.historialActivo();
    return estado ? Math.min(estado.slide * this.OBSERVACIONES_SLIDE_SIZE, estado.items.length) : 0;
  });
  readonly progresoHistorial = computed(() => {
    const total = this.historialActivo()?.items.length ?? 0;
    return total ? (this.historialVistas() / total) * 100 : 0;
  });
  readonly totalSlidesHistorial = computed(() =>
    Math.max(1, Math.ceil((this.historialActivo()?.items.length ?? 0) / this.OBSERVACIONES_SLIDE_SIZE))
  );
  readonly historialSlide = computed(() => {
    const estado = this.historialActivo();
    if (!estado) return [];
    const inicio = (estado.slide - 1) * this.OBSERVACIONES_SLIDE_SIZE;
    return estado.items
      .slice(inicio, inicio + this.OBSERVACIONES_SLIDE_SIZE)
      .map(item => ({ id: (item.id_registro || item.id_diagnostico || item.id_alergia || item.id_medicamento || item.id_examen || item.id) as string, ...this.resumenRegistro(item) }));
  });
  readonly modalRegistroAbierto = signal(false);
  readonly detalleRegistroCargando = signal(false);
  readonly detalleRegistro = signal<DetalleRegistroClinico | null>(null);

  private hoyLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private temporizadorIndicadorObservaciones: ReturnType<typeof setTimeout> | null = null;

  readonly modalRecursosAbierto = signal(false);
  readonly recursosCargando = signal(false);
  readonly recursosFicha = signal<RecursoFichaItem[]>([]);
  readonly filtroTipoRecurso = signal<string>('todos');
  readonly textoFiltroRecurso = signal<string>('');
  readonly paginaRecursos = signal(1);

  readonly recursosFiltrados = computed(() => {
    let lista = this.recursosFicha();
    const tipo = this.filtroTipoRecurso().toLowerCase();
    const texto = this.textoFiltroRecurso().toLowerCase().trim();

    if (tipo !== 'todos') {
      lista = lista.filter(r => r.tipo_recurso.toLowerCase().includes(tipo));
    }

    if (texto) {
      lista = lista.filter(r =>
        (r.descripcion && r.descripcion.toLowerCase().includes(texto)) ||
        (r.establecimiento_origen && r.establecimiento_origen.toLowerCase().includes(texto)) ||
        (r.tipo_recurso && r.tipo_recurso.toLowerCase().includes(texto)) ||
        (r.codigo_fhir && r.codigo_fhir.toLowerCase().includes(texto))
      );
    }

    return lista;
  });

  readonly totalPaginasRecursos = computed(() =>
    Math.ceil(this.recursosFiltrados().length / this.MODAL_PAGE_SIZE) || 1
  );

  readonly recursosPaginados = computed(() => {
    const start = (this.paginaRecursos() - 1) * this.MODAL_PAGE_SIZE;
    return this.recursosFiltrados().slice(start, start + this.MODAL_PAGE_SIZE);
  });

  readonly modalDetalleAbierto = signal(false);
  readonly modalDetalleCerrando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardandoDerivacion = signal(false);
  readonly detalleDerivacion = signal<DetalleDerivacionAtencion | null>(null);
  readonly areaDerivacionSeleccionada = signal('');
  readonly profesionalDerivacionSeleccionado = signal('');
  readonly modalFichaAbierto = signal(false);
  readonly fichaCargando = signal(false);
  readonly fichaGuardando = signal(false);
  readonly fichaClinica = signal<FichaClinicaAtencion | null>(null);
  readonly fichaRol = signal('');
  readonly fichaForm = signal({ estado: 'En curso', aplicaLicencia: false, fechaDesde: '', fechaHasta: '' });
  readonly fichaDiagnosticos = signal<Array<{ codigo_cie10: string; descripcion: string }>>([]);
  readonly fichaObservaciones = signal<Array<{ tipo_observacion: string; valor: string; unidad_medida: string }>>([]);
  readonly fichaMedicamentos = signal<Array<{ nombre_medicamento: string; dosis: string; via_administracion: string; intervalo_horas: number; dias_tratamiento: number }>>([]);
  readonly nuevoDiagnostico = signal({ codigo_cie10: '', descripcion: '' });
  readonly nuevaObservacion = signal({ tipo_observacion: 'General', valor: '', unidad_medida: '' });
  readonly LIMITE_DETALLE_OBSERVACIONES = 300;
  readonly fichaDetalleObservaciones = signal('');
  readonly medicamentoEnEdicion = signal({ nombre_medicamento: '', dosis: '', via_administracion: 'Oral', intervalo_horas: 8, dias_tratamiento: 7 });
  readonly fichaAlergias = signal<FichaClinicaAtencion['alergias']>([]);
  readonly fichaExamenes = signal<FichaClinicaAtencion['examenes']>([]);
  readonly nuevaAlergia = signal({ alergeno: '', tipo_reaccion: '', criticidad: '' });
  readonly nuevoExamen = signal({ tipo_examen: '', resultado: '' });
  readonly fichaPuedeEditar = computed(() => this.fichaClinica()?.puede_editar ?? false);
  readonly fichaEstadoOpciones: OpcionAutocomplete[] = [
    { id: 'En curso', nombre: 'En curso' },
    { id: 'Finalizado', nombre: 'Finalizado' }
  ];
  readonly fichaLicenciaOpciones: OpcionAutocomplete[] = [
    { id: 'no', nombre: 'No aplica licencia' },
    { id: 'si', nombre: 'Aplica licencia' }
  ];
  readonly fichaTieneContenido = computed(() => {
    const ficha = this.fichaClinica();
    return !!ficha && (ficha.diagnosticos.length > 0 || ficha.observaciones.length > 0 || ficha.medicamentos.length > 0 || ficha.alergias.length > 0 || ficha.examenes.length > 0);
  });
  readonly fichaMuestraContenidoClinico = computed(() => this.fichaPuedeEditar() || this.fichaTieneContenido());
  readonly medicamentosCatalogoOpciones = computed<OpcionAutocomplete[]>(() =>
    (this.fichaClinica()?.medicamentos_catalogo ?? []).map(nombre => ({ id: nombre, nombre }))
  );
  readonly diagnosticosCatalogoOpciones = computed<OpcionAutocomplete[]>(() => this.fichaClinica()?.diagnosticos_catalogo ?? []);
  readonly observacionesCatalogoOpciones = computed<OpcionAutocomplete[]>(() => this.fichaClinica()?.observaciones_catalogo ?? []);
  readonly alergiasCatalogoOpciones = computed<OpcionAutocomplete[]>(() => this.fichaClinica()?.alergias_catalogo ?? []);
  readonly criticidadCatalogoOpciones = computed<OpcionAutocomplete[]>(() => this.fichaClinica()?.criticidad_catalogo ?? []);
  readonly examenesCatalogoOpciones = computed<OpcionAutocomplete[]>(() => this.fichaClinica()?.examenes_catalogo ?? []);
  readonly observacionActiva = computed<ObservacionCatalogo | null>(() => {
    const codigo = this.nuevaObservacion().tipo_observacion;
    return this.fichaClinica()?.observaciones_catalogo.find(item => item.id === codigo) ?? null;
  });
  readonly observacionMuestraUnidad = computed(() => !!this.observacionActiva()?.unidad_sugerida);
  readonly observacionValorLabel = computed(() =>
    this.observacionActiva()?.tipo_valor === 'numerico' ? 'Valor' : 'Descripción o valor'
  );
  readonly observacionValorPlaceholder = computed(() =>
    this.observacionActiva()?.formato === 'temperatura'
      ? 'Ingrese temperatura'
      : this.observacionActiva()?.ejemplo || 'Escribe el detalle de la observación'
  );
  readonly areasDerivacionDetalle = computed<OpcionAutocomplete[]>(() =>
    (this.detalleDerivacion()?.areas_derivacion ?? []).map(area => ({ id: area.id, nombre: area.nombre }))
  );
  readonly profesionalesDerivacionDetalle = computed<OpcionAutocomplete[]>(() =>
    (this.detalleDerivacion()?.profesionales_disponibles ?? []).map(profesional => ({
      id: profesional.id,
      nombre: `${profesional.nombre}${profesional.especialidad ? ` — ${profesional.especialidad}` : ''}`
    }))
  );

  readonly modalNuevaAbierto = signal(false);
  readonly modalNuevaCerrando = signal(false);
  readonly validandoNueva = signal(false);
  readonly guardandoNueva = signal(false);
  readonly buscandoRutNueva = signal(false);
  readonly cargandoComunas = signal(false);
  readonly catalogosNueva = signal<CatalogosNuevaAtencion | null>(null);
  readonly contextoNueva = signal<ContextoUsuarioAtencion | null>(null);
  readonly comunasNueva = signal<OpcionCatalogo[]>([]);
  readonly medicamentosNueva = signal<any[] | null>(null);
  readonly cargandoMedicamentosNueva = signal(false);
  readonly formNueva = signal<Record<string, string>>(this.formNuevaVacio());
  readonly hoyIso = this.hoyLocal();
  readonly opcionesSexo: OpcionAutocomplete[] = [
    { id: 'F', nombre: 'Femenino' },
    { id: 'M', nombre: 'Masculino' }
  ];
  readonly tiposAtencionNueva = computed<OpcionAutocomplete[]>(() =>
    (this.catalogosNueva()?.tipos_atencion ?? []).map(tipo => ({ id: tipo, nombre: tipo }))
  );
  readonly areasDerivacionNueva = computed<OpcionAutocomplete[]>(() =>
    this.catalogosNueva()?.areas_derivacion ?? []
  );
  readonly estadoNueva = computed<OpcionAutocomplete[]>(() => {
    const estado = this.catalogosNueva()?.estado_inicial || 'Programada';
    return [{ id: estado, nombre: estado }];
  });
  private rutCargadoNueva = '';
  private temporizadorRutNueva: number | undefined;

  constructor(
    private readonly gestionClinicaApi: GestionClinicaApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pestanasPermitidas'] && !this.mostrarPestana(this.tabActiva())) {
      this.setTab(this.pestanasPermitidas?.[0] ?? 'pacientes');
    } else if (changes['tabInicial'] && this.tabInicial !== this.tabActiva() && this.mostrarPestana(this.tabInicial)) {
      this.setTab(this.tabInicial);
    }
  }

  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const caracteres = input.value.toUpperCase().replace(/[^0-9K]/g, '');
    const posicionK = caracteres.indexOf('K');
    const limpio = posicionK >= 0 ? `${caracteres.slice(0, posicionK)}K` : caracteres.slice(0, 9);

    if (!limpio) {
      this.rutInput.set('');
      input.value = '';
      return;
    }

    const cuerpo = limpio.slice(0, -1);
    const digitoVerificador = limpio.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const rutFormateado = cuerpo ? `${cuerpoFormateado}-${digitoVerificador}` : digitoVerificador;

    this.rutInput.set(rutFormateado);
    input.value = rutFormateado;
  }

  private formNuevaVacio(): Record<string, string> {
    return {
      rut: '',
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      sexo: '',
      telefono: '',
      direccion: '',
      id_region: '',
      id_comuna: '',
      id_tipo_alergia: '',
      id_area_derivada: '',
      tipo_atencion: '',
      fecha_atencion: this.hoyLocal(),
      motivo_consulta: ''
    };
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

  private rutLimpio(rut: string): string {
    return rut.replace(/[.\-]/g, '').toUpperCase();
  }

  abrirModalNuevaAtencion(): void {
    this.formNueva.set(this.formNuevaVacio());
    this.comunasNueva.set([]);
    this.medicamentosNueva.set(null);
    this.rutCargadoNueva = '';
    this.validandoNueva.set(false);
    this.modalNuevaCerrando.set(false);
    this.modalNuevaAbierto.set(true);
    this.cargarCatalogosNueva();

    this.gestionClinicaApi.obtenerContextoUsuario().subscribe({
      next: (contexto) => this.contextoNueva.set(contexto),
      error: () => {
        this.contextoNueva.set(null);
        void this.mostrarErrorNueva('No se pudo obtener el centro de salud del usuario.');
      }
    });
  }

  cerrarModalNueva(): void {
    window.clearTimeout(this.temporizadorRutNueva);
    this.modalNuevaCerrando.set(true);
    window.setTimeout(() => {
      this.modalNuevaAbierto.set(false);
      this.modalNuevaCerrando.set(false);
    }, 260);
  }

  private cargarCatalogosNueva(): void {
    const cache = this.catalogosNueva();
    if (cache) {
      this.actualizarCampoNueva('tipo_atencion', cache.tipos_atencion[0] ?? '');
      return;
    }

    this.gestionClinicaApi.obtenerCatalogosNuevaAtencion().subscribe({
      next: (catalogos) => {
        this.catalogosNueva.set(catalogos);
        this.actualizarCampoNueva('tipo_atencion', catalogos.tipos_atencion[0] ?? '');
      },
      error: () => void this.mostrarErrorNueva('No se pudieron cargar los catálogos del formulario.')
    });
  }

  actualizarCampoNueva(campo: string, valor: string): void {
    this.formNueva.update(form => ({ ...form, [campo]: valor }));
  }

  campoInvalidoNueva(campo: string): boolean {
    return this.validandoNueva() && !(this.formNueva()[campo] ?? '').trim();
  }

  actualizarTelefonoNueva(valor: string): void {
    this.actualizarCampoNueva('telefono', valor.replace(/\D/g, '').slice(0, 9));
  }

  telefonoInvalidoNueva(): boolean {
    const telefono = this.formNueva()['telefono'] ?? '';
    return this.validandoNueva() && telefono.length > 0 && telefono.length < 9;
  }

  private normalizarTelefono(valor: string | null | undefined): string {
    const digitos = (valor ?? '').replace(/\D/g, '');
    return digitos.length > 9 && digitos.startsWith('56') ? digitos.slice(2, 11) : digitos.slice(0, 9);
  }

  onRutNuevaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const formateado = this.formatearRut(input.value);
    input.value = formateado;
    this.actualizarCampoNueva('rut', formateado);
    window.clearTimeout(this.temporizadorRutNueva);

    const limpio = this.rutLimpio(formateado);
    if (this.rutCargadoNueva && limpio !== this.rutCargadoNueva) {
      this.limpiarDatosPacienteNueva();
    }
    if (limpio.length >= 8) {
      this.temporizadorRutNueva = window.setTimeout(() => this.buscarPacienteNueva(), 500);
    }
  }

  private limpiarDatosPacienteNueva(): void {
    this.rutCargadoNueva = '';
    this.comunasNueva.set([]);
    this.medicamentosNueva.set(null);
    this.formNueva.update(form => ({
      ...form,
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      sexo: '',
      telefono: '',
      direccion: '',
      id_region: '',
      id_comuna: ''
    }));
  }

  buscarPacienteNueva(): void {
    const rut = this.formNueva()['rut'];
    const limpio = this.rutLimpio(rut);
    if (limpio.length < 8 || limpio === this.rutCargadoNueva) return;

    this.buscandoRutNueva.set(true);
    this.gestionClinicaApi.obtenerPacienteNuevaAtencion(rut).subscribe({
      next: (paciente) => {
        this.buscandoRutNueva.set(false);
        if (this.rutLimpio(this.formNueva()['rut']) !== limpio || !paciente.encontrado) return;

        this.rutCargadoNueva = limpio;
        this.formNueva.update(form => ({
          ...form,
          nombres: paciente.nombres ?? '',
          apellido_paterno: paciente.apellido_paterno ?? '',
          apellido_materno: paciente.apellido_materno ?? '',
          fecha_nacimiento: paciente.fecha_nacimiento ?? '',
          sexo: paciente.sexo ?? '',
          telefono: this.normalizarTelefono(paciente.telefono),
          direccion: paciente.direccion ?? '',
          id_region: paciente.id_region ?? '',
          id_comuna: ''
        }));
        if (paciente.id_region) {
          this.cargarComunasNueva(paciente.id_region, paciente.id_comuna ?? '');
        }
        this.cargarMedicamentosNueva(rut);
      },
      error: () => this.buscandoRutNueva.set(false)
    });
  }

  private cargarMedicamentosNueva(rut: string): void {
    this.cargandoMedicamentosNueva.set(true);
    this.gestionClinicaApi.listarMedicamentos(rut).subscribe({
      next: (medicamentos) => {
        this.cargandoMedicamentosNueva.set(false);
        if (this.rutLimpio(this.formNueva()['rut']) !== this.rutLimpio(rut)) return;
        this.medicamentosNueva.set(Array.isArray(medicamentos) ? medicamentos : []);
      },
      error: () => {
        this.cargandoMedicamentosNueva.set(false);
        this.medicamentosNueva.set([]);
      }
    });
  }

  vecesAlMes(frecuencia: string | null): string {
    const texto = (frecuencia ?? '').toLowerCase();
    const cadaHoras = /cada\s+(\d+)\s*horas?/.exec(texto);
    if (cadaHoras) return String(Math.round((24 / Number(cadaHoras[1])) * 30));
    if (/una vez al d[ií]a|diari/.test(texto)) return '30';
    return frecuencia || '—';
  }

  duracionMedicamento(item: { fecha_inicio?: string | null; fecha_fin?: string | null }): string {
    if (!item.fecha_inicio) return '—';
    if (!item.fecha_fin) return `Desde ${this.formatFecha(item.fecha_inicio)} (sin término definido)`;
    const dias = Math.max(1, Math.round((new Date(item.fecha_fin).getTime() - new Date(item.fecha_inicio).getTime()) / 86400000));
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  onRegionNuevaChange(idRegion: string): void {
    this.formNueva.update(form => ({ ...form, id_region: idRegion, id_comuna: '' }));
    this.comunasNueva.set([]);
    if (idRegion) {
      this.cargarComunasNueva(idRegion);
    }
  }

  private cargarComunasNueva(idRegion: string, idComuna = ''): void {
    this.cargandoComunas.set(true);
    this.gestionClinicaApi.listarComunasPorRegion(idRegion).subscribe({
      next: (respuesta) => {
        this.cargandoComunas.set(false);
        if (this.formNueva()['id_region'] !== idRegion) return;
        this.comunasNueva.set(respuesta.comunas ?? []);
        if (idComuna) this.actualizarCampoNueva('id_comuna', idComuna);
      },
      error: () => {
        this.cargandoComunas.set(false);
        this.comunasNueva.set([]);
        void this.mostrarErrorNueva('No se pudieron cargar las comunas.');
      }
    });
  }

  guardarNuevaAtencion(): void {
    this.validandoNueva.set(true);
    const form = this.formNueva();
    const requeridos: [string, string][] = [
      ['rut', 'RUT'],
      ['nombres', 'Nombres'],
      ['apellido_paterno', 'Apellido paterno'],
      ['apellido_materno', 'Apellido materno'],
      ['fecha_nacimiento', 'Fecha de nacimiento'],
      ['sexo', 'Sexo'],
      ['direccion', 'Dirección'],
      ['id_region', 'Región'],
      ['id_comuna', 'Comuna'],
      ['id_area_derivada', 'Área de derivación'],
      ['tipo_atencion', 'Tipo de atención'],
      ['fecha_atencion', 'Fecha de atención'],
      ['motivo_consulta', 'Motivo de la asistencia']
    ];
    const vacios = requeridos.filter(([campo]) => !(form[campo] ?? '').trim()).map(([, etiqueta]) => etiqueta);

    if (vacios.length > 0) {
      void Swal.fire({
        icon: 'info',
        title: 'Campos incompletos',
        html: `<p>Por favor completa los siguientes campos:</p><ul style="text-align:left;margin-top:0.5rem">${vacios.map((campo) => `<li style="color:#0a3a86;font-weight:600">• ${campo}</li>`).join('')}</ul>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    if (this.telefonoInvalidoNueva()) {
      void Swal.fire({ icon: 'info', title: 'Teléfono inválido', text: 'Ingresa los 9 dígitos del número de contacto.', confirmButtonColor: '#0b4aa8' });
      return;
    }

    if (this.guardandoNueva()) return;
    this.guardandoNueva.set(true);

    this.gestionClinicaApi.registrarNuevaAtencion({
      rut: form['rut'],
      nombres: form['nombres'],
      apellido_paterno: form['apellido_paterno'],
      apellido_materno: form['apellido_materno'],
      fecha_nacimiento: form['fecha_nacimiento'],
      sexo: form['sexo'],
      telefono: form['telefono'] ? `+56${form['telefono']}` : '',
      direccion: form['direccion'],
      id_region: form['id_region'],
      id_comuna: form['id_comuna'],
      id_tipo_alergia: form['id_tipo_alergia'],
      id_area_derivada: form['id_area_derivada'],
      tipo_atencion: form['tipo_atencion'],
      fecha_atencion: form['fecha_atencion'],
      motivo_consulta: form['motivo_consulta']
    }).subscribe({
      next: (resultado) => {
        this.guardandoNueva.set(false);
        this.cerrarModalNueva();
        this.rutInput.set(form['rut']);
        this.buscarPaciente();
        void Swal.fire({
          icon: 'success',
          title: 'Atención registrada',
          text: resultado.paciente_nuevo
            ? 'El paciente y la atención fueron registrados correctamente en estado "Programada".'
            : 'La atención fue registrada correctamente en estado "Programada".',
          confirmButtonColor: '#0b4aa8'
        });
      },
      error: (error) => {
        this.guardandoNueva.set(false);
        const datosInvalidos = error?.status === 400;
        const mensaje = typeof error?.error?.message === 'string' ? error.error.message : 'No se pudo registrar la atención.';
        void Swal.fire({
          icon: datosInvalidos ? 'warning' : 'error',
          title: datosInvalidos ? 'Datos inválidos' : 'Error',
          text: mensaje,
          confirmButtonColor: '#0b4aa8'
        });
      }
    });
  }

  private mostrarErrorNueva(texto: string): Promise<unknown> {
    return Swal.fire({
      icon: 'error',
      title: 'Error',
      text: texto,
      confirmButtonColor: '#0b4aa8'
    });
  }

  setTab(tab: TabClinica): void {
    if (!this.mostrarPestana(tab)) return;
    this.tabActiva.set(tab);
    if (tab === 'atenciones') this.paginaAtenciones.set(1);
    this.cargarTabActual();
  }

  paginarLista<T>(lista: T[], paginaActual: number, tamanio: number): T[] {
    const inicio = (paginaActual - 1) * tamanio;
    return lista.slice(inicio, inicio + tamanio);
  }

  totalPaginasLista<T>(lista: T[], tamanio: number): number {
    return Math.max(1, Math.ceil(lista.length / tamanio));
  }

  cambiarPagina(delta: number): void {
    this.irAPagina(this.paginaAtenciones() + delta);
  }

  irAPagina(pagina: number): void {
    const destino = Math.min(Math.max(1, pagina), this.totalPaginasLista(this.atenciones(), this.ATENCIONES_PAGE_SIZE));
    this.paginaAtenciones.set(destino);
  }

  getPaginasLista<T>(lista: T[], tamanio: number): number[] {
    return Array.from({ length: this.totalPaginasLista(lista, tamanio) }, (_, index) => index + 1);
  }

  getTabNombre(): string {
    const map: Record<TabClinica, string> = {
      pacientes: 'Pacientes',
      atenciones: 'Atenciones',
      diagnosticos: 'Diagnósticos',
      alergias: 'Alergias',
      medicamentos: 'Medicamentos',
      examenes: 'Exámenes',
      observaciones: 'Observaciones Clínicas'
    };
    return map[this.tabActiva()] || 'Pestaña';
  }

  mostrarPestana(tab: TabClinica): boolean {
    return !this.pestanasPermitidas || this.pestanasPermitidas.includes(tab);
  }

  claseEstadoAtencion(estado: string | null | undefined): string {
    const estadoNormalizado = (estado ?? '').toLowerCase().trim();
    if (estadoNormalizado === 'programada') return 'estado-programada';
    if (estadoNormalizado === 'en curso') return 'estado-en-curso';
    if (estadoNormalizado === 'realizada' || estadoNormalizado === 'realizado' || estadoNormalizado === 'finalizado') return 'estado-finalizado';
    return 'estado-neutral';
  }

  iconoEstadoAtencion(estado: string | null | undefined): string {
    const estadoNormalizado = (estado ?? '').toLowerCase().trim();
    if (estadoNormalizado === 'programada') return 'bi-calendar-event';
    if (estadoNormalizado === 'en curso') return 'bi-play-circle-fill';
    if (estadoNormalizado === 'realizada' || estadoNormalizado === 'realizado' || estadoNormalizado === 'finalizado') return 'bi-check-circle-fill';
    return 'bi-info-circle-fill';
  }

  buscarPaciente(): void {
    const rut = this.rutInput().trim();
    if (!rut) {
      void Swal.fire({
        icon: 'info',
        title: 'RUT requerido',
        text: 'Debes ingresar un RUT para buscar el paciente.',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    this.cargando.set(true);
    const startTime = Date.now();

    this.gestionClinicaApi.buscarPacientePorRut(rut).subscribe({
      next: (res) => {
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, 600 - elapsedTime);

        setTimeout(() => {
          this.paciente.set(res);
          this.busquedaRealizada.set(true);
          this.cargando.set(false);
          this.cdr.markForCheck();
          this.cargarTabActual();
        }, remainingDelay);
      },
      error: (err) => {
        console.error('Error al buscar paciente:', err);
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, 600 - elapsedTime);

        setTimeout(() => {
          this.paciente.set({
            encontrado: false,
            id_paciente: null,
            rut: null,
            nombre_completo: null,
            fecha_nacimiento: null,
            edad: 0,
            sexo: null,
            recursos_ficha: 0,
            atenciones: 0,
            alergias_registradas: 0,
            medicamentos_activos: 0
          });
          this.busquedaRealizada.set(true);
          this.cargando.set(false);
          this.cdr.markForCheck();
        }, remainingDelay);
      }
    });
  }

  private cargarTabActual(): void {
    if (this.tabActiva() === 'atenciones') {
      this.cargarAtenciones();
    }
  }

  private cargarAtenciones(): void {
    const rut = this.filtroRutAtenciones().trim() || undefined;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarAtenciones(rut).subscribe({
      next: (res) => {
        this.atenciones.set(Array.isArray(res) ? res : []);
        this.paginaAtenciones.set(1);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.atenciones.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  buscarAtenciones(): void {
    if (!this.filtroRutAtenciones().trim()) {
      void Swal.fire({
        icon: 'info',
        title: 'RUT requerido',
        text: 'Ingresa un RUT para realizar la búsqueda.',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    this.cargarAtenciones();
  }

  onRutAtencionesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const rutFormateado = this.formatearRut(input.value);
    this.filtroRutAtenciones.set(rutFormateado);
    input.value = rutFormateado;
  }

  onRutObservacionesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const rutFormateado = this.formatearRut(input.value);
    this.rutObservaciones.set(rutFormateado);
    input.value = rutFormateado;
  }

  buscarObservacionesPorRut(): void {
    const rut = this.rutObservaciones().trim();
    if (!rut) {
      void Swal.fire({
        icon: 'info',
        title: 'RUT requerido',
        text: 'Ingresa un RUT para consultar el historial clínico.',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    this.cargandoTab.set(true);
    this.busquedaObservacionesRealizada.set(false);
    this.pacienteObservaciones.set(null);
    this.observaciones.set([]);
    this.slideObservaciones.set(1);

    this.gestionClinicaApi.buscarPacientePorRut(rut).subscribe({
      next: (paciente) => {
        this.pacienteObservaciones.set(paciente);
        this.busquedaObservacionesRealizada.set(true);

        if (!paciente?.encontrado) {
          this.cargandoTab.set(false);
          this.cdr.markForCheck();
          return;
        }

        this.gestionClinicaApi.listarObservaciones(rut).subscribe({
          next: (observaciones) => {
            this.observaciones.set(Array.isArray(observaciones) ? observaciones : []);
            this.slideObservaciones.set(1);
            this.activarIndicadorObservaciones();
            this.cargandoTab.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.observaciones.set([]);
            this.cargandoTab.set(false);
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.pacienteObservaciones.set(null);
        this.busquedaObservacionesRealizada.set(true);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private activarIndicadorObservaciones(): void {
    if (this.temporizadorIndicadorObservaciones) {
      clearTimeout(this.temporizadorIndicadorObservaciones);
    }

    this.indicadorObservacionesActualizado.set(true);
    this.temporizadorIndicadorObservaciones = setTimeout(() => {
      this.indicadorObservacionesActualizado.set(false);
      this.temporizadorIndicadorObservaciones = null;
      this.cdr.markForCheck();
    }, 1100);
  }

  cambiarSlideObservaciones(delta: number): void {
    const destino = Math.min(Math.max(1, this.slideObservaciones() + delta), this.totalSlidesObservaciones());
    if (destino === this.slideObservaciones()) return;

    this.direccionSlideObservaciones.set(delta > 0 ? 'siguiente' : 'anterior');
    this.slideObservaciones.set(destino);
  }

  irASlideObservaciones(slide: number): void {
    const destino = Math.min(Math.max(1, slide), this.totalSlidesObservaciones());
    if (destino === this.slideObservaciones()) return;

    this.direccionSlideObservaciones.set(destino > this.slideObservaciones() ? 'siguiente' : 'anterior');
    this.slideObservaciones.set(destino);
  }

  abrirDetalleObservacion(idObservacion: string | null | undefined): void {
    if (!idObservacion) return;

    this.detalleObservacion.set(null);
    this.detalleObservacionCargando.set(true);
    this.modalObservacionAbierto.set(true);
    this.gestionClinicaApi.obtenerDetalleObservacion(idObservacion).subscribe({
      next: (detalle) => {
        this.detalleObservacion.set(detalle);
        this.detalleObservacionCargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.detalleObservacionCargando.set(false);
        this.cerrarDetalleObservacion();
        void Swal.fire({
          icon: 'error',
          title: 'No se pudo cargar el detalle',
          text: 'Intenta nuevamente para consultar la observación.',
          confirmButtonColor: '#0b4aa8'
        });
      }
    });
  }

  cerrarDetalleObservacion(): void {
    this.modalObservacionAbierto.set(false);
    this.detalleObservacionCargando.set(false);
    this.detalleObservacion.set(null);
  }

  private resumenRegistro(item: any): { tipo: string; titulo: string; fecha: string; contexto: Array<{ icono: string; texto: string }> } {
    const contexto = (...partes: Array<[string, string | null | undefined]>) =>
      partes.filter(([, texto]) => !!texto).map(([icono, texto]) => ({ icono, texto: texto as string }));

    switch (this.tabHistorial()) {
      case 'diagnosticos':
        return {
          tipo: item.codigo_cie10 ? (item.origen === 'Ejemplo MINSAL' ? `SNOMED: ${item.codigo_cie10}` : `CIE-10: ${item.codigo_cie10}`) : 'Diagnóstico',
          titulo: item.descripcion || 'Sin detalle registrado',
          fecha: this.formatFecha(item.fecha_diagnostico || item.fecha_registro),
          contexto: contexto(
            ['bi-flag', item.estado],
            ['bi-tag', item.origen],
            ['bi-clipboard2-pulse', item.tipo_atencion],
            ['bi-person-badge', item.profesional_nombre],
            ['bi-hospital', item.establecimiento || item.establecimiento_origen]
          )
        };
      case 'alergias':
        return {
          tipo: item.criticidad ? `Criticidad ${item.criticidad}` : 'Alergia',
          titulo: item.alergeno || 'Sin alérgeno registrado',
          fecha: this.formatFechaHora(item.fecha_registro),
          contexto: contexto(
            ['bi-lightning-charge', item.tipo_reaccion],
            ['bi-tag', item.origen],
            ['bi-chat-square-text', item.observacion || item.descripcion],
            ['bi-clipboard2-pulse', item.tipo_atencion],
            ['bi-person-badge', item.profesional_nombre],
            ['bi-hospital', item.establecimiento || item.establecimiento_origen]
          )
        };
      case 'medicamentos':
        return {
          tipo: 'Medicamento',
          titulo: item.nombre_medicamento || 'Sin nombre registrado',
          fecha: this.formatFecha(item.fecha_inicio || item.fecha_registro),
          contexto: contexto(
            ['bi-eyedropper', item.dosis ? `Dosis: ${item.dosis}` : null],
            ['bi-clock-history', item.frecuencia ? `Frec: ${item.frecuencia}` : null],
            ['bi-signpost-split', item.via_administracion ? `Vía: ${item.via_administracion}` : null],
            ['bi-flag', item.estado],
            ['bi-tag', item.origen],
            ['bi-person-badge', item.profesional_nombre],
            ['bi-hospital', item.establecimiento || item.establecimiento_origen]
          )
        };
      default:
        return {
          tipo: item.tipo_examen || 'Examen',
          titulo: item.resultado || 'Sin resultado registrado',
          fecha: this.formatFechaHora(item.fecha_examen || item.fecha_registro),
          contexto: contexto(
            ['bi-flag', item.estado],
            ['bi-tag', item.origen],
            ['bi-clipboard2-pulse', item.tipo_atencion],
            ['bi-person-badge', item.profesional_nombre],
            ['bi-hospital', item.establecimiento || item.establecimiento_origen]
          )
        };
    }
  }

  private actualizarHistorial(tab: TipoRegistroHistorial, cambios: Partial<EstadoHistorial>): void {
    this.historiales.update(estado => ({ ...estado, [tab]: { ...estado[tab], ...cambios } }));
  }

  onRutHistorialInput(event: Event): void {
    const tab = this.tabHistorial();
    const input = event.target as HTMLInputElement;
    if (!tab || !input) return;

    const rutFormateado = this.formatearRut(input.value);
    this.actualizarHistorial(tab, { rut: rutFormateado });
    input.value = rutFormateado;
  }

  buscarHistorialPorRut(): void {
    const tab = this.tabHistorial();
    if (!tab) return;

    const rut = this.historiales()[tab].rut.trim();
    if (!rut) {
      void Swal.fire({
        icon: 'info',
        title: 'RUT requerido',
        text: 'Ingresa un RUT para consultar el historial clínico.',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    this.cargandoTab.set(true);
    this.actualizarHistorial(tab, { busquedaRealizada: false, paciente: null, items: [], slide: 1 });

    const terminar = (cambios: Partial<EstadoHistorial>) => {
      this.actualizarHistorial(tab, { busquedaRealizada: true, ...cambios });
      this.cargandoTab.set(false);
      this.cdr.markForCheck();
    };

    this.gestionClinicaApi.buscarPacientePorRut(rut).subscribe({
      next: (paciente) => {
        if (!paciente?.encontrado) {
          terminar({ paciente });
          return;
        }

        this.listarHistorial(tab, rut).subscribe({
          next: (items) => terminar({ paciente, items: Array.isArray(items) ? items : [], slide: 1 }),
          error: () => terminar({ paciente, items: [] })
        });
      },
      error: () => terminar({ paciente: null })
    });
  }

  private listarHistorial(tab: TipoRegistroHistorial, rut: string) {
    switch (tab) {
      case 'diagnosticos': return this.gestionClinicaApi.listarDiagnosticos(rut);
      case 'alergias': return this.gestionClinicaApi.listarAlergias(rut);
      case 'medicamentos': return this.gestionClinicaApi.listarMedicamentos(rut);
      case 'examenes': return this.gestionClinicaApi.listarExamenes(rut);
    }
  }

  irASlideHistorial(slide: number): void {
    const tab = this.tabHistorial();
    if (!tab) return;

    const actual = this.historiales()[tab].slide;
    const destino = Math.min(Math.max(1, slide), this.totalSlidesHistorial());
    if (destino === actual) return;

    this.actualizarHistorial(tab, { slide: destino, direccion: destino > actual ? 'siguiente' : 'anterior' });
  }

  cambiarSlideHistorial(delta: number): void {
    const estado = this.historialActivo();
    if (estado) this.irASlideHistorial(estado.slide + delta);
  }

  abrirDetalleRegistro(id: string | null | undefined): void {
    const tab = this.tabHistorial();
    if (!tab || !id) return;

    this.detalleRegistro.set(null);
    this.detalleRegistroCargando.set(true);
    this.modalRegistroAbierto.set(true);
    this.gestionClinicaApi.obtenerDetalleRegistro(tab, id).subscribe({
      next: (detalle) => {
        this.detalleRegistro.set(detalle);
        this.detalleRegistroCargando.set(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cerrarDetalleRegistro();
        void Swal.fire({
          icon: 'error',
          title: 'No se pudo cargar el detalle',
          text: error?.error?.message || 'Intenta nuevamente para consultar el registro.',
          confirmButtonColor: '#0b4aa8'
        });
      }
    });
  }

  cerrarDetalleRegistro(): void {
    this.modalRegistroAbierto.set(false);
    this.detalleRegistroCargando.set(false);
    this.detalleRegistro.set(null);
  }

  buscarAtencionPorRut(rut: string | null | undefined): void {
    const rutFormateado = this.formatearRut(rut ?? '');
    if (!rutFormateado) return;

    this.filtroRutAtenciones.set(rutFormateado);
    this.cargarAtenciones();
  }

  abrirModalDetalle(idAtencion: string): void {
    if (this.obtenerCodigoRolActual() !== 'ADMIN') {
      this.abrirFichaClinica(idAtencion);
      return;
    }

    this.cargandoDetalle.set(true);
    this.modalDetalleCerrando.set(false);
    this.modalDetalleAbierto.set(true);
    this.gestionClinicaApi.obtenerDetalleDerivacion(idAtencion).subscribe({
      next: (detalle) => {
        this.detalleDerivacion.set(detalle);
        this.areaDerivacionSeleccionada.set(detalle.atencion.id_area_destino ?? '');
        this.profesionalDerivacionSeleccionado.set(detalle.atencion.id_profesional_atiende ?? '');
        this.cargandoDetalle.set(false);
        if (detalle.atencion.id_area_destino) {
          this.cambiarAreaDerivacion(detalle.atencion.id_area_destino);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.cerrarModalDetalle();
        void Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de la atención.', confirmButtonColor: '#0b4aa8' });
      }
    });
  }

  private obtenerCodigoRolActual(): string {
    const raw = localStorage.getItem('usuario_sesion');
    if (!raw) return '';
    try {
      const usuario = JSON.parse(raw) as Record<string, unknown>;
      const rol = (usuario['rol'] ?? {}) as Record<string, unknown>;
      return String(usuario['codigo_rol'] ?? usuario['nombre_rol'] ?? rol['codigo'] ?? rol['nombre'] ?? '').toUpperCase();
    } catch {
      return '';
    }
  }

  abrirFichaClinica(idAtencion: string): void {
    this.fichaCargando.set(true);
    this.fichaRol.set(this.obtenerCodigoRolActual());
    this.modalFichaAbierto.set(true);
    this.gestionClinicaApi.obtenerFichaClinica(idAtencion).subscribe({
      next: (ficha) => {
        this.fichaClinica.set(ficha);
        this.fichaForm.set({
          estado: ficha.atencion.estado === 'Programada' || ficha.atencion.estado === 'Realizada' ? 'En curso' : ficha.atencion.estado,
          aplicaLicencia: ficha.licencia.aplica,
          fechaDesde: ficha.licencia.fecha_desde ?? '',
          fechaHasta: ficha.licencia.fecha_hasta ?? ''
        });
        this.fichaDiagnosticos.set(ficha.diagnosticos.map(item => ({ codigo_cie10: item.codigo_cie10 ?? '', descripcion: item.descripcion })));
        this.fichaObservaciones.set(ficha.observaciones.map(item => ({ tipo_observacion: item.tipo_observacion, valor: item.valor, unidad_medida: item.unidad_medida ?? '' })));
        this.fichaDetalleObservaciones.set(ficha.atencion.detalle_observaciones ?? '');
        this.fichaMedicamentos.set(ficha.medicamentos.map(item => ({
          nombre_medicamento: item.nombre_medicamento,
          dosis: item.dosis ?? '',
          via_administracion: item.via_administracion ?? 'Oral',
          intervalo_horas: item.intervalo_horas,
          dias_tratamiento: item.dias_tratamiento
        })));
        this.fichaAlergias.set(ficha.alergias.map(item => ({ ...item })));
        this.fichaExamenes.set(ficha.examenes.map(item => ({ ...item })));
        this.fichaCargando.set(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.fichaCargando.set(false);
        this.modalFichaAbierto.set(false);
        void Swal.fire({ icon: 'error', title: 'No se pudo cargar la ficha', text: error?.error?.message || 'No tienes acceso a esta atención.', confirmButtonColor: '#0b4aa8' });
      }
    });
  }

  cerrarFichaClinica(): void {
    this.modalFichaAbierto.set(false);
    this.fichaClinica.set(null);
  }

  actualizarFichaEstado(estado: string): void {
    this.fichaForm.update(form => ({ ...form, estado }));
  }

  actualizarFichaLicencia(aplica: boolean): void {
    this.fichaForm.update(form => ({ ...form, aplicaLicencia: aplica, ...(aplica ? {} : { fechaDesde: '', fechaHasta: '' }) }));
  }

  actualizarFichaFecha(campo: 'fechaDesde' | 'fechaHasta', valor: string): void {
    this.fichaForm.update(form => ({ ...form, [campo]: valor }));
  }

  actualizarMedicamento(campo: string, valor: string | number): void {
    this.medicamentoEnEdicion.update(medicamento => ({ ...medicamento, [campo]: campo === 'intervalo_horas' || campo === 'dias_tratamiento' ? Number(valor) : valor }));
  }

  actualizarNuevoDiagnostico(campo: 'codigo_cie10' | 'descripcion', valor: string): void {
    this.nuevoDiagnostico.update(diagnostico => ({ ...diagnostico, [campo]: valor }));
  }

  seleccionarDiagnostico(codigo: string): void {
    const opcion = this.diagnosticosCatalogoOpciones().find(item => item.id === codigo);
    this.nuevoDiagnostico.set({
      codigo_cie10: (codigo || '').toUpperCase(),
      descripcion: opcion?.nombre.replace(/^\S+\s\((.*)\)$/, '$1') ?? ''
    });
  }

  agregarDiagnosticoFicha(): void {
    const diagnostico = this.nuevoDiagnostico();
    if (!diagnostico.descripcion.trim()) return;
    this.fichaDiagnosticos.update(lista => [...lista, { ...diagnostico }]);
    this.nuevoDiagnostico.set({ codigo_cie10: '', descripcion: '' });
  }

  quitarDiagnosticoFicha(indice: number): void {
    this.fichaDiagnosticos.update(lista => lista.filter((_, posicion) => posicion !== indice));
  }

  actualizarNuevaObservacion(campo: 'tipo_observacion' | 'valor' | 'unidad_medida', valor: string): void {
    if (campo === 'tipo_observacion') {
      const opcion = this.fichaClinica()?.observaciones_catalogo.find(item => item.id === valor);
      this.nuevaObservacion.update(observacion => ({
        ...observacion,
        tipo_observacion: valor,
        valor: '',
        unidad_medida: opcion?.unidad_sugerida ?? ''
      }));
      return;
    }

    if (campo === 'valor') {
      valor = this.formatearValorObservacion(valor);
    }

    this.nuevaObservacion.update(observacion => ({ ...observacion, [campo]: valor }));
  }

  private formatearValorObservacion(valor: string): string {
    const formato = this.observacionActiva()?.formato;
    if (formato === 'presion_arterial') {
      const digitos = valor.replace(/\D/g, '');
      const largoSistolica = /^[12]/.test(digitos) ? 3 : 2;
      const limitados = digitos.slice(0, largoSistolica + 3);
      return limitados.length > largoSistolica ? `${limitados.slice(0, largoSistolica)}/${limitados.slice(largoSistolica)}` : limitados;
    }
    if (formato === 'temperatura') {
      const digitos = valor.replace(/\D/g, '').slice(0, 3);
      return digitos.length > 2 ? `${digitos.slice(0, 2)}.${digitos.slice(2)}` : digitos;
    }
    if (formato === 'decimal') {
      const limpio = valor.replace(',', '.').replace(/[^0-9.]/g, '');
      const partes = limpio.split('.');
      return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio;
    }
    if (formato === 'entero' || formato === 'entero_rango') {
      return valor.replace(/\D/g, '');
    }
    return valor;
  }

  agregarObservacionFicha(): void {
    const observacion = this.nuevaObservacion();
    if (!observacion.valor.trim()) return;
    if (this.observacionActiva()?.formato === 'presion_arterial') {
      const [sistolica, diastolica] = observacion.valor.split('/').map(Number);
      if (!/^\d{2,3}\/\d{2,3}$/.test(observacion.valor) || sistolica < 50 || sistolica > 260 || diastolica < 30 || diastolica > 150 || sistolica <= diastolica) {
        void Swal.fire({ icon: 'info', title: 'Presión arterial inválida', text: 'Ingresa los números seguidos, por ejemplo 12080 se mostrará como 120/80 (sistólica 50-260, diastólica 30-150).', confirmButtonColor: '#0b4aa8' });
        return;
      }
    }
    if (this.observacionActiva()?.formato === 'temperatura' && !(/^\d{2}(\.\d)?$/.test(observacion.valor) && Number(observacion.valor) >= 30 && Number(observacion.valor) <= 45)) {
      void Swal.fire({ icon: 'info', title: 'Temperatura inválida', text: 'Ingresa un valor entre 30 y 45 °C; 371 se mostrará como 37.1.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    if (this.observacionActiva()?.formato === 'entero_rango' && Number(observacion.valor) > 10) {
      void Swal.fire({ icon: 'info', title: 'Valor fuera de rango', text: 'La escala de dolor debe estar entre 0 y 10.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    this.fichaObservaciones.update(lista => [...lista, { ...observacion }]);
    this.nuevaObservacion.set({ tipo_observacion: 'General', valor: '', unidad_medida: '' });
  }

  quitarObservacionFicha(indice: number): void {
    this.fichaObservaciones.update(lista => lista.filter((_, posicion) => posicion !== indice));
  }

  actualizarDetalleObservaciones(valor: string): void {
    this.fichaDetalleObservaciones.set(valor.slice(0, this.LIMITE_DETALLE_OBSERVACIONES));
  }

  agregarMedicamentoFicha(): void {
    const medicamento = this.medicamentoEnEdicion();
    if (!medicamento.nombre_medicamento || medicamento.intervalo_horas < 1 || medicamento.intervalo_horas > 24 || medicamento.dias_tratamiento < 1 || medicamento.dias_tratamiento > 365) {
      void Swal.fire({ icon: 'info', title: 'Indicaciones inválidas', text: 'Selecciona un medicamento e indica entre 1 y 24 horas y entre 1 y 365 días.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    this.fichaMedicamentos.update(medicamentos => [...medicamentos, { ...medicamento }]);
    this.medicamentoEnEdicion.set({ nombre_medicamento: '', dosis: '', via_administracion: 'Oral', intervalo_horas: 8, dias_tratamiento: 7 });
  }

  quitarMedicamentoFicha(indice: number): void {
    this.fichaMedicamentos.update(medicamentos => medicamentos.filter((_, posicion) => posicion !== indice));
  }

  actualizarNuevaAlergia(campo: 'alergeno' | 'tipo_reaccion' | 'criticidad', valor: string): void {
    this.nuevaAlergia.update(alergia => ({ ...alergia, [campo]: valor }));
  }

  agregarAlergiaFicha(): void {
    const alergia = this.nuevaAlergia();
    if (!alergia.alergeno.trim()) {
      void Swal.fire({ icon: 'info', title: 'Alergia incompleta', text: 'Selecciona el alérgeno que deseas registrar.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    this.fichaAlergias.update(lista => [...lista, { ...alergia }]);
    this.nuevaAlergia.set({ alergeno: '', tipo_reaccion: '', criticidad: '' });
  }

  quitarAlergiaFicha(indice: number): void {
    this.fichaAlergias.update(lista => lista.filter((_, posicion) => posicion !== indice));
  }

  actualizarNuevoExamen(campo: 'tipo_examen' | 'resultado', valor: string): void {
    this.nuevoExamen.update(examen => ({ ...examen, [campo]: valor }));
  }

  agregarExamenFicha(): void {
    const examen = this.nuevoExamen();
    if (!examen.tipo_examen.trim()) {
      void Swal.fire({ icon: 'info', title: 'Examen incompleto', text: 'Selecciona el tipo de examen que deseas registrar.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    this.fichaExamenes.update(lista => [...lista, { ...examen }]);
    this.nuevoExamen.set({ tipo_examen: '', resultado: '' });
  }

  quitarExamenFicha(indice: number): void {
    this.fichaExamenes.update(lista => lista.filter((_, posicion) => posicion !== indice));
  }

  generarDiagnostico(): void {
    const ficha = this.fichaClinica();
    if (!ficha?.puede_generar_diagnostico) return;

    const marco = document.createElement('iframe');
    marco.setAttribute('aria-hidden', 'true');
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(marco);
    const ventana = marco.contentWindow;
    if (!ventana) {
      marco.remove();
      return;
    }
    const pestana = window.open('', '_blank');

    this.gestionClinicaApi.obtenerDiagnosticoPdf(ficha.atencion.id_atencion).subscribe({
      next: reporte => {
        if (pestana) this.abrirDiagnosticoPdf(reporte, pestana, false);
        ventana.addEventListener('afterprint', () => marco.remove(), { once: true });
        this.abrirDiagnosticoPdf(reporte, ventana);
      },
      error: error => {
        marco.remove();
        pestana?.close();
        void Swal.fire({ icon: 'error', title: 'No se pudo generar el diagnóstico', text: error?.error?.message || 'No fue posible obtener la información clínica.', confirmButtonColor: '#0b4aa8' });
      }
    });
  }

  private abrirDiagnosticoPdf(reporte: DiagnosticoPdfReport, ventana: Window, imprimirAlAbrir = true): void {
    const escapar = (valor: string): string => valor.replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caracter] ?? caracter));
    const centro = reporte.establecimiento ?? {};
    const nombreCentro = escapar(centro.nombre || 'Establecimiento de salud público');
    const tipoCentro = escapar(centro.tipo || 'Red pública de salud');
    const ubicacion = escapar([centro.direccion, centro.comuna, centro.region].filter(Boolean).join(' · ') || 'Ubicación no informada');
    const identidadRemota = reporte.identidad ?? {};
    const identidad = {
      logo: identidadRemota.logo_recurso || '',
      logoUrl: identidadRemota.logo_url || (identidadRemota.logo_recurso ? `${window.location.origin}/assets/images/${identidadRemota.logo_recurso}` : ''),
      primary: identidadRemota.color_primario || '#2456a6',
      secondary: identidadRemota.color_secundario || '#46b8d9',
      tertiary: identidadRemota.color_acento || '#82c7e8',
      soft: identidadRemota.color_primario ? `${identidadRemota.color_primario}12` : '#f3f7fb',
      font: "Arial,'Helvetica Neue',sans-serif",
      display: identidadRemota.fuente_marca ? `'${identidadRemota.fuente_marca}','Helvetica Neue',Arial,sans-serif` : "'Helvetica Neue',Arial,sans-serif"
    };
    const nombreMarca = escapar(identidadRemota.nombre_marca || centro.nombre || 'Establecimiento de salud público');
    const marcaInstitucional = identidad.logo
      ? `<img src="${window.location.origin}/assets/images/${identidad.logo}" alt="Identidad institucional">`
      : `<div class="brand-mark" aria-label="${nombreCentro}">${escapar((centro.nombre || 'Salud').slice(0, 2).toUpperCase())}</div>`;
    const lista = (items: string[], vacio: string): string => items.length ? `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>` : `<p class="empty">${vacio}</p>`;
    const diagnosticos = reporte.diagnosticos.map(item => `<article class="diagnostico-card"><span class="code">${escapar(item.codigo_cie10 || 'SIN CÓDIGO')}</span><strong>${escapar(item.descripcion)}</strong><small>${escapar(item.estado || 'Confirmado')}</small></article>`);
    const observaciones = reporte.observaciones.map(item => escapar(`${item.tipo_observacion}: ${item.valor}${item.unidad_medida ? ` ${item.unidad_medida}` : ''}`));
    const medicamentos = reporte.medicamentos.map(item => escapar(`${item.nombre_medicamento} · ${item.dosis || 'Sin dosis'} · cada ${item.intervalo_horas} horas por ${item.dias_tratamiento} días`));
    const alergias = reporte.alergias.map(item => escapar([item.alergeno, item.criticidad ? `Criticidad ${item.criticidad}` : '', item.tipo_reaccion || ''].filter(Boolean).join(' · ')));
    const examenes = reporte.examenes.map(item => escapar(`${item.tipo_examen}${item.resultado ? `: ${item.resultado}` : ''}${item.fecha_examen ? ` · ${this.formatFecha(item.fecha_examen)}` : ''}`));
    const detalleObservaciones = reporte.atencion.detalle_observaciones
      ? `<span class="label" style="margin-top:12px">Detalle de observaciones</span><p class="detalle-obs">${escapar(reporte.atencion.detalle_observaciones)}</p>`
      : '';
    const fechaAtencion = escapar(this.formatFechaHora(reporte.atencion.fecha_inicio));
    const fechaGeneracion = escapar(this.formatFechaHora(reporte.generado_en));

    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Diagnóstico clínico · ${nombreCentro}</title><style>
      @font-face{font-family:'Great Vibes';font-style:normal;font-weight:400;font-display:swap;src:url('${window.location.origin}/assets/fonts/great-vibes.ttf') format('truetype')}
      :root{--ink:#26334b;--muted:#68748a;--blue:${identidad.primary};--cyan:${identidad.secondary};--green:${identidad.tertiary};--line:#d8e3f0;--soft:${identidad.soft};--accent:#f5d7e8;--font:${identidad.font};--display:${identidad.display}}
      *{box-sizing:border-box}body{font-family:var(--font);color:var(--ink);margin:0;background:#eef3f8;line-height:1.45}
      .page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm 16mm 16mm;position:relative}
      .topline{height:7px;background:linear-gradient(90deg,var(--blue) 0 55%,var(--cyan) 55% 78%,var(--green) 78%);position:absolute;left:0;right:0;top:0}
      .masthead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding:10px 0 18px;gap:24px}
      .brand{display:flex;align-items:center;gap:14px}.brand img{width:150px;height:50px;object-fit:contain;border-radius:0}.brand-mark{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--blue);color:#fff;font-weight:bold;font-size:16px}.brand h1{font-family:var(--display);font-size:24px;font-weight:800;line-height:1.05;margin:0;color:var(--blue)}.brand p{font-family:var(--font);margin:5px 0 0;color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase}
      .issuer{text-align:right;font-size:11px;color:var(--muted);max-width:260px}.issuer strong{display:block;color:var(--ink);font-size:15px;margin-bottom:3px}.issuer span{display:block}
      .title-row{display:flex;justify-content:space-between;align-items:end;margin:26px 0 18px}.title-row h2{font-size:27px;margin:0;color:var(--ink)}.folio{font-size:11px;color:var(--muted);text-align:right}.folio b{display:block;color:var(--blue);font-size:13px}
      .patient{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}.patient div{background:var(--soft);padding:13px 15px}.label{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;font-weight:bold;margin-bottom:4px}.value{font-size:14px;font-weight:bold}
      .section{margin-top:22px}.section-head{display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--accent);padding-bottom:8px;margin-bottom:10px}.section-head i{width:25px;height:25px;border-radius:50%;background:var(--blue);color:white;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:12px}.section-head h3{font-size:16px;margin:0;color:var(--blue)}
      .diagnostico-card{display:grid;grid-template-columns:88px 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid #c9deee;border-left:5px solid var(--cyan);border-radius:7px;margin:8px 0;background:#fbfdff}.code{font-size:11px;color:var(--blue);font-weight:bold}.diagnostico-card strong{font-size:15px}.diagnostico-card small{color:var(--muted);font-size:10px;text-transform:uppercase}
      ul{list-style:none;padding:0;margin:0}li{padding:10px 12px;margin:7px 0;background:var(--soft);border-left:4px solid var(--cyan);font-size:13px}.empty{color:var(--muted);font-size:12px}.detalle-obs{margin:4px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:6px;font-size:13px;white-space:pre-wrap}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.meta-card{border:1px solid var(--line);border-radius:8px;padding:12px 14px}.meta-card strong{font-size:13px}.footer{position:absolute;bottom:12mm;left:16mm;right:16mm;border-top:1px solid var(--line);padding-top:8px;display:flex;justify-content:space-between;color:var(--muted);font-size:9px}.footer b{color:var(--blue)}
      @media print{body{background:#fff}.page{margin:0;width:auto;min-height:100vh;padding-bottom:22mm}@page{size:A4;margin:0}.no-print{display:none}}
    </style></head><body><main class="page"><div class="topline"></div><header class="masthead"><div class="brand"><img src="${window.location.origin}/assets/images/logo_sichcp.png" alt="SICHCP"><div><h1>${nombreCentro}</h1><p>${tipoCentro}</p></div></div><div class="issuer"><strong>Ficha clínica de atención</strong><span>${ubicacion}</span><span>Documento generado por SICHCP</span></div></header><div class="title-row"><h2>Informe clínico</h2><div class="folio"><b>ATENCIÓN ${escapar(reporte.atencion.id_atencion.slice(0, 8).toUpperCase())}</b>Emitido ${fechaGeneracion}</div></div><section class="patient"><div><span class="label">Paciente</span><span class="value">${escapar(reporte.atencion.nombre_paciente)}</span></div><div><span class="label">RUT</span><span class="value">${escapar(reporte.atencion.rut)}</span></div><div><span class="label">Fecha de atención</span><span class="value">${fechaAtencion}</span></div></section><section class="section"><div class="section-head"><i>01</i><h3>Diagnóstico</h3></div>${lista(diagnosticos, 'Sin diagnósticos registrados.')}</section><section class="section"><div class="section-head"><i>02</i><h3>Observaciones clínicas</h3></div>${lista(observaciones, 'Sin observaciones registradas.')}${detalleObservaciones}</section><section class="section"><div class="section-head"><i>03</i><h3>Medicamentos e indicaciones</h3></div>${lista(medicamentos, 'Sin medicamentos registrados.')}</section><section class="section"><div class="section-head"><i>04</i><h3>Alergias</h3></div>${lista(alergias, 'Sin alergias registradas.')}</section><section class="section"><div class="section-head"><i>05</i><h3>Exámenes</h3></div>${lista(examenes, 'Sin exámenes registrados.')}</section><div class="meta"><div class="meta-card"><span class="label">Profesional tratante</span><strong>${escapar(reporte.atencion.profesional_nombre || 'No informado')}</strong></div><div class="meta-card"><span class="label">Estado de atención</span><strong>${escapar(reporte.atencion.estado)}</strong></div></div><footer class="footer"><span><b>${nombreCentro}</b> · ${escapar(centro.comuna || 'Red pública de salud')}</span><span>SICHCP · Documento clínico interoperable</span></footer></main></body></html>`);
    ventana.document.close();
    const logo = ventana.document.querySelector<HTMLImageElement>('.brand img');
    if (logo && identidad.logoUrl) {
      logo.src = identidad.logoUrl;
      logo.alt = `${nombreCentro} · identidad institucional`;
    } else {
      logo?.remove();
    }
    const issuerNote = ventana.document.querySelector<HTMLElement>('.issuer span:last-child');
    if (issuerNote) issuerNote.textContent = 'Documento institucional';
    const brandName = ventana.document.querySelector<HTMLElement>('.brand h1');
    if (brandName) brandName.textContent = nombreMarca;
    const footerNote = ventana.document.querySelector<HTMLElement>('.footer span:last-child');
    if (footerNote) footerNote.textContent = 'Ficha clínica interoperable';
    if (!imprimirAlAbrir) return;
    let impreso = false;
    const imprimir = (): void => {
      if (impreso) return;
      impreso = true;
      ventana.focus();
      ventana.print();
    };
    if (logo && !logo.complete) {
      logo.addEventListener('load', imprimir, { once: true });
      window.setTimeout(imprimir, 250);
    } else {
      window.requestAnimationFrame(imprimir);
    }
  }

  guardarFichaClinica(): void {
    const ficha = this.fichaClinica();
    const formulario = this.fichaForm();
    if (!ficha || !this.fichaPuedeEditar()) return;
    if (formulario.aplicaLicencia && (!formulario.fechaDesde || !formulario.fechaHasta || formulario.fechaHasta < formulario.fechaDesde)) {
      void Swal.fire({ icon: 'info', title: 'Fechas de licencia inválidas', text: 'La fecha hasta debe ser igual o posterior a la fecha desde.', confirmButtonColor: '#0b4aa8' });
      return;
    }
    this.fichaGuardando.set(true);
    this.gestionClinicaApi.guardarFichaClinica(ficha.atencion.id_atencion, {
      estado: formulario.estado,
      licencia: { aplica: formulario.aplicaLicencia, fecha_desde: formulario.aplicaLicencia ? formulario.fechaDesde : null, fecha_hasta: formulario.aplicaLicencia ? formulario.fechaHasta : null },
      diagnosticos: this.fichaDiagnosticos(),
      observaciones: this.fichaObservaciones(),
      detalle_observaciones: this.fichaDetalleObservaciones().trim(),
      medicamentos: this.fichaMedicamentos(),
      alergias: this.fichaAlergias(),
      examenes: this.fichaExamenes()
    }).subscribe({
      next: actualizado => {
        this.fichaGuardando.set(false);
        this.fichaClinica.set(actualizado);
        this.cargarAtenciones();
        this.cerrarFichaClinica();
        void Swal.fire({ icon: 'success', title: 'Ficha actualizada', text: 'Los antecedentes clínicos fueron guardados correctamente.', confirmButtonColor: '#0b4aa8' });
      },
      error: error => {
        this.fichaGuardando.set(false);
        void Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error?.error?.message || 'Revisa los datos ingresados.', confirmButtonColor: '#0b4aa8' });
      }
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleCerrando.set(true);
    window.setTimeout(() => {
      this.modalDetalleAbierto.set(false);
      this.modalDetalleCerrando.set(false);
      this.detalleDerivacion.set(null);
    }, 260);
  }

  cambiarAreaDerivacion(idArea: string): void {
    const detalle = this.detalleDerivacion();
    if (!detalle) return;

    const profesionalActual = this.profesionalDerivacionSeleccionado();
    this.areaDerivacionSeleccionada.set(idArea);
    this.profesionalDerivacionSeleccionado.set('');
    this.gestionClinicaApi.obtenerDetalleDerivacion(detalle.atencion.id_atencion, idArea).subscribe({
      next: (actualizado) => {
        const profesionales = actualizado.profesionales_disponibles ?? [];
        const profesionalSeleccionado = profesionales.some(profesional => profesional.id === profesionalActual)
          ? profesionalActual
          : profesionales[0]?.id ?? '';

        this.detalleDerivacion.update(actual => actual ? {
          ...actual,
          areas_derivacion: actualizado.areas_derivacion,
          profesionales_disponibles: profesionales
        } : actualizado);
        this.profesionalDerivacionSeleccionado.set(profesionalSeleccionado);
        this.cdr.markForCheck();
      },
      error: () => void Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los profesionales disponibles.', confirmButtonColor: '#0b4aa8' })
    });
  }

  guardarDerivacion(): void {
    const detalle = this.detalleDerivacion();
    const idArea = this.areaDerivacionSeleccionada();
    if (!detalle || !idArea) return;

    const idProfesional = this.profesionalDerivacionSeleccionado();
    if (!idProfesional) {
      void Swal.fire({
        icon: 'info',
        title: 'Médico pendiente',
        text: 'Selecciona un médico disponible antes de guardar la derivación.',
        confirmButtonColor: '#0b4aa8'
      });
      return;
    }

    this.guardandoDerivacion.set(true);
    this.gestionClinicaApi.derivarAtencion(detalle.atencion.id_atencion, {
      id_area_derivada: idArea,
      id_profesional_atiende: idProfesional
    }).subscribe({
      next: (respuesta) => {
        this.guardandoDerivacion.set(false);
        this.detalleDerivacion.set(respuesta);
        this.areaDerivacionSeleccionada.set(respuesta.atencion.id_area_destino ?? '');
        this.profesionalDerivacionSeleccionado.set(respuesta.atencion.id_profesional_atiende ?? '');
        this.atenciones.update(lista => lista.map(item =>
          item.id_atencion === respuesta.atencion.id_atencion || item.id_registro === respuesta.atencion.id_atencion
            ? {
                ...item,
                estado: respuesta.atencion.estado,
                area_destino: respuesta.atencion.area_destino,
                medico_nombre: respuesta.atencion.profesional_nombre
              }
            : item
        ));
        this.cargarAtenciones();
        this.cerrarModalDetalle();
        void Swal.fire({ icon: 'success', title: 'Derivación guardada', text: `Atención asignada a ${respuesta.atencion.profesional_nombre || 'un profesional disponible'}.`, confirmButtonColor: '#0b4aa8' });
      },
      error: (error) => {
        this.guardandoDerivacion.set(false);
        void Swal.fire({ icon: 'info', title: 'No se pudo derivar', text: error?.error?.message || 'No hay profesionales disponibles para el área seleccionada.', confirmButtonColor: '#0b4aa8' });
      }
    });
  }

  formatRut(rutStr: string | null): string {
    if (!rutStr) return '';
    const limpio = rutStr.replace(/[^0-9Kk]/g, '').toUpperCase();
    if (limpio.length < 2) return limpio;
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpo}-${limpio.slice(-1)}`;
  }

  formatFecha(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr);
    if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
    try {
      const fecha = new Date(fechaStr);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      return `${dia}/${mes}/${fecha.getFullYear()}`;
    } catch {
      return fechaStr;
    }
  }

  formatFechaHora(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    try {
      const fecha = new Date(fechaStr);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      const horas = String(fecha.getHours()).padStart(2, '0');
      const mins = String(fecha.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${anio} ${horas}:${mins}`;
    } catch {
      return fechaStr;
    }
  }

  abrirModalRecursos(filtroInicial: string = 'todos'): void {
    const rut = this.paciente()?.rut || this.rutInput().trim();
    if (!rut) return;

    this.filtroTipoRecurso.set(filtroInicial);
    this.textoFiltroRecurso.set('');
    this.paginaRecursos.set(1);
    this.modalRecursosAbierto.set(true);
    this.recursosCargando.set(true);
    this.cdr.markForCheck();

    this.gestionClinicaApi.obtenerRecursosFicha(rut).subscribe({
      next: (lista) => {
        this.recursosFicha.set(lista || []);
        this.recursosCargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.recursosFicha.set([]);
        this.recursosCargando.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  cerrarModalRecursos(): void {
    this.modalRecursosAbierto.set(false);
    this.cdr.markForCheck();
  }

  setFiltroTipoRecurso(tipo: string): void {
    this.filtroTipoRecurso.set(tipo);
    this.paginaRecursos.set(1);
    this.cdr.markForCheck();
  }

  onTextoFiltroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.textoFiltroRecurso.set(input.value);
      this.paginaRecursos.set(1);
      this.cdr.markForCheck();
    }
  }

  cambiarPaginaRecursos(delta: number): void {
    const nuevaPag = this.paginaRecursos() + delta;
    if (nuevaPag >= 1 && nuevaPag <= this.totalPaginasRecursos()) {
      this.paginaRecursos.set(nuevaPag);
      this.cdr.markForCheck();
    }
  }

  getBadgeColorClass(tipo: string): string {
    const key = (tipo || '').toLowerCase();
    if (key.includes('atenci')) return 'badge-atencion';
    if (key.includes('diagn')) return 'badge-diagnostico';
    if (key.includes('alerg')) return 'badge-alergia';
    if (key.includes('medica')) return 'badge-medicamento';
    if (key.includes('exam')) return 'badge-examen';
    if (key.includes('observa')) return 'badge-observacion';
    return 'badge-default';
  }

  getFhirIconClass(codigoFhir: string): string {
    const key = (codigoFhir || '').toLowerCase();
    if (key.includes('encounter')) return 'bi-clipboard2-pulse-fill';
    if (key.includes('condition')) return 'bi-heart-pulse-fill';
    if (key.includes('allergy')) return 'bi-shield-fill-exclamation';
    if (key.includes('medication')) return 'bi-capsule-pill';
    if (key.includes('diagnostic')) return 'bi-clipboard2-check-fill';
    if (key.includes('observation')) return 'bi-journal-medical';
    return 'bi-file-earmark-medical-fill';
  }
}
