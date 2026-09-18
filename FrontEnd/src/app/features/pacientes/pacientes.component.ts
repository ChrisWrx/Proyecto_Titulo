import { Component, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GestionClinicaApiService, PacienteSearchResult, RecursoFichaItem } from '../../core/services/gestion-clinica-api.service';

export type TabClinica = 'pacientes' | 'atenciones' | 'diagnosticos' | 'alergias' | 'medicamentos' | 'examenes' | 'observaciones';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacientesComponent {
  readonly PAGE_SIZE = 10;
  readonly MODAL_PAGE_SIZE = 5;

  readonly estadosClinica: Record<string, string[]> = {
    atenciones: [],
    diagnosticos: [],
    alergias: [],
    medicamentos: [],
    examenes: [],
    observaciones: []
  };

  rutInput = signal('');
  tabActiva = signal<TabClinica>('pacientes');

  readonly paginaAtenciones = signal(1);
  readonly paginaDiagnosticos = signal(1);
  readonly paginaAlergias = signal(1);
  readonly paginaMedicamentos = signal(1);
  readonly paginaExamenes = signal(1);
  readonly paginaObservaciones = signal(1);

  cargando = signal(false);
  busquedaRealizada = signal(false);
  paciente = signal<PacienteSearchResult | null>(null);

  readonly atenciones = signal<any[]>([]);
  readonly diagnosticos = signal<any[]>([]);
  readonly alergias = signal<any[]>([]);
  readonly medicamentos = signal<any[]>([]);
  readonly examenes = signal<any[]>([]);
  readonly observaciones = signal<any[]>([]);
  readonly cargandoTab = signal(false);

  readonly formAtenciones = signal<Record<string, string>>({
    tipo_atencion: 'Consulta',
    motivo_consulta: '',
    estado: '',
    fecha_inicio: new Date().toISOString().slice(0, 16),
    fecha_fin: ''
  });

  readonly formDiagnosticos = signal<Record<string, string>>({
    codigo_cie10: '',
    descripcion: '',
    estado: '',
    fecha_diagnostico: new Date().toISOString().slice(0, 10)
  });

  readonly formAlergias = signal<Record<string, string>>({
    alergeno: '',
    tipo_reaccion: '',
    criticidad: '',
    observacion: ''
  });

  readonly formMedicamentos = signal<Record<string, string>>({
    nombre_medicamento: '',
    dosis: '',
    frecuencia: '',
    via_administracion: 'Oral',
    estado: ''
  });

  readonly formExamenes = signal<Record<string, string>>({
    tipo_examen: '',
    resultado: '',
    estado: '',
    fecha_examen: new Date().toISOString().slice(0, 10)
  });

  readonly formObservaciones = signal<Record<string, string>>({
    tipo_observacion: '',
    valor: '',
    unidad_medida: '',
    fecha_observacion: new Date().toISOString().slice(0, 16)
  });

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

  constructor(
    private readonly gestionClinicaApi: GestionClinicaApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.cargarEstadosClinica();
  }

  private cargarEstadosClinica(): void {
    this.gestionClinicaApi.listarEstadosClinica().subscribe({
      next: (estados) => {
        estados.forEach(({ categoria, valor }) => {
          if (this.estadosClinica[categoria]) {
            this.estadosClinica[categoria].push(valor);
          }
        });

        this.formAtenciones.update(form => ({ ...form, estado: this.estadosClinica.atenciones[0] || '' }));
        this.formDiagnosticos.update(form => ({ ...form, estado: this.estadosClinica.diagnosticos[0] || '' }));
        this.formAlergias.update(form => ({ ...form, criticidad: this.estadosClinica.alergias[0] || '' }));
        this.formMedicamentos.update(form => ({ ...form, estado: this.estadosClinica.medicamentos[0] || '' }));
        this.formExamenes.update(form => ({ ...form, estado: this.estadosClinica.examenes[0] || '' }));
        this.formObservaciones.update(form => ({ ...form, tipo_observacion: this.estadosClinica.observaciones[0] || '' }));
        this.cdr.markForCheck();
      },
      error: (error) => console.error('Error al cargar catálogo de estados clínicos:', error)
    });
  }

  private estadoInicial(categoria: string): string {
    return this.estadosClinica[categoria]?.[0] || '';
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

  setTab(tab: TabClinica): void {
    this.tabActiva.set(tab);
    this.resetPaginacionTab(tab);
    this.cargarTabActual();
  }

  private resetPaginacionTab(tab: TabClinica): void {
    switch (tab) {
      case 'atenciones':
        this.paginaAtenciones.set(1);
        break;
      case 'diagnosticos':
        this.paginaDiagnosticos.set(1);
        break;
      case 'alergias':
        this.paginaAlergias.set(1);
        break;
      case 'medicamentos':
        this.paginaMedicamentos.set(1);
        break;
      case 'examenes':
        this.paginaExamenes.set(1);
        break;
      case 'observaciones':
        this.paginaObservaciones.set(1);
        break;
      default:
        break;
    }
  }

  paginarLista<T>(lista: T[], paginaActual: number): T[] {
    const inicio = (paginaActual - 1) * this.PAGE_SIZE;
    return lista.slice(inicio, inicio + this.PAGE_SIZE);
  }

  totalPaginasLista<T>(lista: T[]): number {
    return Math.max(1, Math.ceil(lista.length / this.PAGE_SIZE));
  }

  getPaginaActual(tab: TabClinica): number {
    switch (tab) {
      case 'atenciones': return this.paginaAtenciones();
      case 'diagnosticos': return this.paginaDiagnosticos();
      case 'alergias': return this.paginaAlergias();
      case 'medicamentos': return this.paginaMedicamentos();
      case 'examenes': return this.paginaExamenes();
      case 'observaciones': return this.paginaObservaciones();
      default: return 1;
    }
  }

  cambiarPagina(tab: TabClinica, delta: number): void {
    const mapa = {
      atenciones: this.paginaAtenciones,
      diagnosticos: this.paginaDiagnosticos,
      alergias: this.paginaAlergias,
      medicamentos: this.paginaMedicamentos,
      examenes: this.paginaExamenes,
      observaciones: this.paginaObservaciones
    } as const;

    const paginaActual = this.getPaginaActual(tab);
    const paginaDestino = Math.min(Math.max(1, paginaActual + delta), this.totalPaginasLista(this.getListaTab(tab)));
    mapa[tab].set(paginaDestino);
  }

  irAPagina(tab: TabClinica, pagina: number): void {
    const mapa = {
      atenciones: this.paginaAtenciones,
      diagnosticos: this.paginaDiagnosticos,
      alergias: this.paginaAlergias,
      medicamentos: this.paginaMedicamentos,
      examenes: this.paginaExamenes,
      observaciones: this.paginaObservaciones
    } as const;

    const destino = Math.min(Math.max(1, pagina), this.totalPaginasLista(this.getListaTab(tab)));
    mapa[tab].set(destino);
  }

  getPaginasLista<T>(lista: T[]): number[] {
    return Array.from({ length: this.totalPaginasLista(lista) }, (_, index) => index + 1);
  }

  private getListaTab(tab: TabClinica): any[] {
    switch (tab) {
      case 'atenciones': return this.atenciones();
      case 'diagnosticos': return this.diagnosticos();
      case 'alergias': return this.alergias();
      case 'medicamentos': return this.medicamentos();
      case 'examenes': return this.examenes();
      case 'observaciones': return this.observaciones();
      default: return [];
    }
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

  buscarPaciente(): void {
    const rut = this.rutInput().trim();
    if (!rut) {
      this.busquedaRealizada.set(true);
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

  private getRutPaciente(): string | null {
    return this.paciente()?.rut || this.rutInput().trim() || null;
  }

  private limpiarListas(): void {
    this.atenciones.set([]);
    this.diagnosticos.set([]);
    this.alergias.set([]);
    this.medicamentos.set([]);
    this.examenes.set([]);
    this.observaciones.set([]);
  }

  private cargarTabActual(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.encontrado) {
      this.limpiarListas();
      return;
    }

    switch (this.tabActiva()) {
      case 'atenciones':
        this.cargarAtenciones();
        break;
      case 'diagnosticos':
        this.cargarDiagnosticos();
        break;
      case 'alergias':
        this.cargarAlergias();
        break;
      case 'medicamentos':
        this.cargarMedicamentos();
        break;
      case 'examenes':
        this.cargarExamenes();
        break;
      case 'observaciones':
        this.cargarObservaciones();
        break;
      default:
        break;
    }
  }

  private cargarAtenciones(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarAtenciones(rut).subscribe({
      next: (res) => {
        this.atenciones.set(Array.isArray(res) ? res : []);
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

  private cargarDiagnosticos(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarDiagnosticos(rut).subscribe({
      next: (res) => {
        this.diagnosticos.set(Array.isArray(res) ? res : []);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.diagnosticos.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private cargarAlergias(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarAlergias(rut).subscribe({
      next: (res) => {
        this.alergias.set(Array.isArray(res) ? res : []);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.alergias.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private cargarMedicamentos(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarMedicamentos(rut).subscribe({
      next: (res) => {
        this.medicamentos.set(Array.isArray(res) ? res : []);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.medicamentos.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private cargarExamenes(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarExamenes(rut).subscribe({
      next: (res) => {
        this.examenes.set(Array.isArray(res) ? res : []);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.examenes.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private cargarObservaciones(): void {
    const rut = this.getRutPaciente();
    if (!rut) return;
    this.cargandoTab.set(true);
    this.gestionClinicaApi.listarObservaciones(rut).subscribe({
      next: (res) => {
        this.observaciones.set(Array.isArray(res) ? res : []);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.observaciones.set([]);
        this.cargandoTab.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  actualizarCampo(tab: TabClinica, campo: string, valor: string): void {
    switch (tab) {
      case 'atenciones':
        this.formAtenciones.set({ ...this.formAtenciones(), [campo]: valor });
        break;
      case 'diagnosticos':
        this.formDiagnosticos.set({ ...this.formDiagnosticos(), [campo]: valor });
        break;
      case 'alergias':
        this.formAlergias.set({ ...this.formAlergias(), [campo]: valor });
        break;
      case 'medicamentos':
        this.formMedicamentos.set({ ...this.formMedicamentos(), [campo]: valor });
        break;
      case 'examenes':
        this.formExamenes.set({ ...this.formExamenes(), [campo]: valor });
        break;
      case 'observaciones':
        this.formObservaciones.set({ ...this.formObservaciones(), [campo]: valor });
        break;
      default:
        break;
    }
  }

  guardarAtencion(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      tipo_atencion: this.formAtenciones().tipo_atencion,
      motivo_consulta: this.formAtenciones().motivo_consulta,
      estado: this.formAtenciones().estado,
      fecha_inicio: this.formAtenciones().fecha_inicio || new Date().toISOString(),
      fecha_fin: this.formAtenciones().fecha_fin || null,
    };

    this.gestionClinicaApi.crearAtencion(payload).subscribe({
      next: () => {
        this.formAtenciones.set({
          tipo_atencion: 'Consulta',
          motivo_consulta: '',
          estado: this.estadoInicial('atenciones'),
          fecha_inicio: new Date().toISOString().slice(0, 16),
          fecha_fin: ''
        });
        this.cargarAtenciones();
      },
      error: (err) => console.error('Error al guardar atención', err)
    });
  }

  guardarDiagnostico(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      codigo_cie10: this.formDiagnosticos().codigo_cie10,
      descripcion: this.formDiagnosticos().descripcion,
      estado: this.formDiagnosticos().estado,
      fecha_diagnostico: this.formDiagnosticos().fecha_diagnostico || new Date().toISOString().slice(0, 10)
    };

    this.gestionClinicaApi.crearDiagnostico(payload).subscribe({
      next: () => {
        this.formDiagnosticos.set({
          codigo_cie10: '',
          descripcion: '',
          estado: this.estadoInicial('diagnosticos'),
          fecha_diagnostico: new Date().toISOString().slice(0, 10)
        });
        this.cargarDiagnosticos();
      },
      error: (err) => console.error('Error al guardar diagnóstico', err)
    });
  }

  guardarAlergia(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      alergeno: this.formAlergias().alergeno,
      tipo_reaccion: this.formAlergias().tipo_reaccion,
      criticidad: this.formAlergias().criticidad,
      observacion: this.formAlergias().observacion
    };

    this.gestionClinicaApi.crearAlergia(payload).subscribe({
      next: () => {
        this.formAlergias.set({
          alergeno: '',
          tipo_reaccion: '',
          criticidad: this.estadoInicial('alergias'),
          observacion: ''
        });
        this.cargarAlergias();
      },
      error: (err) => console.error('Error al guardar alergia', err)
    });
  }

  guardarMedicamento(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      nombre_medicamento: this.formMedicamentos().nombre_medicamento,
      dosis: this.formMedicamentos().dosis,
      frecuencia: this.formMedicamentos().frecuencia,
      via_administracion: this.formMedicamentos().via_administracion,
      estado: this.formMedicamentos().estado
    };

    this.gestionClinicaApi.crearMedicamento(payload).subscribe({
      next: () => {
        this.formMedicamentos.set({
          nombre_medicamento: '',
          dosis: '',
          frecuencia: '',
          via_administracion: 'Oral',
          estado: this.estadoInicial('medicamentos')
        });
        this.cargarMedicamentos();
      },
      error: (err) => console.error('Error al guardar medicamento', err)
    });
  }

  guardarExamen(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      tipo_examen: this.formExamenes().tipo_examen,
      resultado: this.formExamenes().resultado,
      estado: this.formExamenes().estado,
      fecha_examen: this.formExamenes().fecha_examen || new Date().toISOString().slice(0, 10)
    };

    this.gestionClinicaApi.crearExamen(payload).subscribe({
      next: () => {
        this.formExamenes.set({
          tipo_examen: '',
          resultado: '',
          estado: this.estadoInicial('examenes'),
          fecha_examen: new Date().toISOString().slice(0, 10)
        });
        this.cargarExamenes();
      },
      error: (err) => console.error('Error al guardar examen', err)
    });
  }

  guardarObservacion(): void {
    const rut = this.getRutPaciente();
    if (!rut || !this.paciente()?.id_paciente) return;

    const payload = {
      id_paciente: this.paciente()?.id_paciente,
      rut,
      tipo_observacion: this.formObservaciones().tipo_observacion,
      valor: this.formObservaciones().valor,
      unidad_medida: this.formObservaciones().unidad_medida,
      fecha_observacion: this.formObservaciones().fecha_observacion || new Date().toISOString()
    };

    this.gestionClinicaApi.crearObservacion(payload).subscribe({
      next: () => {
        this.formObservaciones.set({
          tipo_observacion: '',
          valor: '',
          unidad_medida: '',
          fecha_observacion: new Date().toISOString().slice(0, 16)
        });
        this.cargarObservaciones();
      },
      error: (err) => console.error('Error al guardar observación', err)
    });
  }

  formatRut(rutStr: string | null): string {
    if (!rutStr) return '';
    const limpio = rutStr.replace(/[^0-9Kk]/g, '').toUpperCase();
    if (limpio.length < 2) return limpio;

    const cuerpo = limpio.slice(0, -1);
    const digitoVerificador = limpio.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpoFormateado}-${digitoVerificador}`;
  }

  formatFecha(fechaStr: string | null): string {
    if (!fechaStr) return '';
    try {
      const fecha = new Date(fechaStr);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fechaStr;
    }
  }

  formatFechaHora(fechaStr: string | null): string {
    if (!fechaStr) return '';
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
