import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MenuApiService, MenuItem } from '../../core/services/menu-api.service';
import { IndicadoresApiService, Indicador, NoticiaItem, RedEstadoResponse, AlertaClinicaItem, AlertaDetalle, AlertaDetalleAlergia, AlertaDetalleMedicamento, AlertaDetalleExamen } from '../../core/services/indicadores-api.service';
import { InteroperabilidadApiService, ResumenInteroperabilidad, RedNodo, RecursoFhir, Integracion } from '../../core/services/interoperabilidad-api.service';
import { MantenedorImagenesComponent } from '../mantenedor-imagenes/mantenedor-imagenes.component';
import { UsuariosComponent } from '../usuarios/usuarios.component';
import { CarruselComponent } from './carrusel/carrusel.component';
import { PacientesComponent, TabClinica } from '../pacientes/pacientes.component';

interface Establecimiento {
  id_establecimiento?: string;
  nombre?: string;
  tipo?: string;
  comuna?: string;
  direccion?: string;
}

interface Usuario {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  nombre_rol: string;
  nombre_establecimiento?: string;
  tipo_establecimiento?: string;
  comuna_establecimiento?: string;
  direccion_establecimiento?: string;
  establecimiento?: Establecimiento;
  [key: string]: unknown;
}

interface MenuNode extends MenuItem {
  children: MenuItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MantenedorImagenesComponent, UsuariosComponent, CarruselComponent, PacientesComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly usuario = signal<Usuario | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly userMenuOpen = signal(false);
  readonly openSections = signal<Record<string, boolean>>({});
  readonly componentActivo = signal<string | null>(null);
  readonly pestanaPacientesInicial = signal<TabClinica>('pacientes');
  readonly pestanasClinicasPermitidas = computed<TabClinica[] | null>(() => {
    const items = this.menuItems();
    if (!items.length) return null;

    const menuClinico = items
      .filter(item => item.ruta?.startsWith('/') || item.nombre.toLowerCase() === 'gestión clínica')
      .map(item => `${item.nombre} ${item.ruta ?? ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .join(' ');

    const pestañas: Array<[TabClinica, string]> = [
      ['pacientes', 'paciente'],
      ['atenciones', 'atencione'],
      ['diagnosticos', 'diagnostic'],
      ['alergias', 'alergia'],
      ['medicamentos', 'medicament'],
      ['examenes', 'examene'],
      ['observaciones', 'observacione']
    ];

    return pestañas.filter(([, clave]) => menuClinico.includes(clave)).map(([pestaña]) => pestaña);
  });
  readonly activeMenuRoute = signal<string | null>(null);
  readonly opcionSeguridadActiva = signal<'usuarios' | 'mantenedor-imagenes'>('usuarios');
  readonly contentAnimationState = signal<'ready' | 'leaving' | 'entering'>('ready');
  readonly isMobile = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly indicadores = signal<Indicador[]>([]);
  readonly indicadoresLoading = signal(false);
  readonly indicadoresAnimados = signal<Record<number, number>>({});
  readonly interoperabilidad = signal<ResumenInteroperabilidad>({ red: [], recursosFhir: [], ultimasIntegraciones: [] });
  readonly interoperabilidadLoading = signal(false);
  readonly redAnimados = signal<Record<number, number>>({});

  readonly noticias = signal<NoticiaItem[]>([]);
  readonly redEstado = signal<RedEstadoResponse>({ items: [], serviciosOperativos: 0 });
  readonly alertasClinicas = signal<AlertaClinicaItem[]>([]);
  readonly panelsLoading = signal(false);

  // ── Modal FHIR ──────────────────────────────────────────
  readonly modalFhirAbierto = signal(false);
  readonly modalFhirDatos = signal<RecursoFhir[]>([]);
  readonly modalFhirCargando = signal(false);
  readonly paginaFhir = signal(1);

  // ── Modal Integraciones ─────────────────────────────────
  readonly modalIntegAbierto = signal(false);
  readonly modalIntegDatos = signal<Integracion[]>([]);
  readonly modalIntegCargando = signal(false);
  readonly paginaInteg = signal(1);

  // ── Modal Noticias ──────────────────────────────────────
  readonly modalNoticiasAbierto = signal(false);
  readonly paginaNoticias = signal(1);

  // ── Modal Alerta detalle ────────────────────────────────
  readonly modalAlertaAbierto = signal(false);
  readonly modalAlertaTitulo = signal('');
  readonly modalAlertaTipo = signal('');
  readonly modalAlertaDatos = signal<AlertaDetalle[]>([]);
  readonly modalAlertaCargando = signal(false);
  readonly paginaAlerta = signal(1);

  private readonly PAGE_SIZE = 5;

  readonly maxRecursoFhir = computed(() => {
    const recursos = this.interoperabilidad().recursosFhir;
    return recursos.length > 0 ? Math.max(...recursos.map(r => r.total_uso)) : 1;
  });

  // ── Noticias: sólo 4 en el dashboard, botón visible si hay más ──
  readonly noticiasVistaDashboard = computed(() => this.noticias().slice(0, 4));
  readonly hayMasNoticias = computed(() => this.noticias().length > 4);

  // ── Paginación modal FHIR ───────────────────────────────
  readonly maxModalFhir = computed(() => {
    const d = this.modalFhirDatos();
    return d.length > 0 ? Math.max(...d.map(r => r.total_uso)) : 1;
  });
  readonly totalPaginasFhir = computed(() => Math.ceil(this.modalFhirDatos().length / this.PAGE_SIZE));
  readonly fhirPaginados = computed(() => {
    const start = (this.paginaFhir() - 1) * this.PAGE_SIZE;
    return this.modalFhirDatos().slice(start, start + this.PAGE_SIZE);
  });

  // ── Paginación modal Integraciones ──────────────────────
  readonly totalPaginasInteg = computed(() => Math.ceil(this.modalIntegDatos().length / this.PAGE_SIZE));
  readonly integPaginados = computed(() => {
    const start = (this.paginaInteg() - 1) * this.PAGE_SIZE;
    return this.modalIntegDatos().slice(start, start + this.PAGE_SIZE);
  });

  // ── Paginación modal Noticias ───────────────────────────
  readonly totalPaginasNoticias = computed(() => Math.ceil(this.noticias().length / this.PAGE_SIZE));
  readonly noticiasPaginadas = computed(() => {
    const start = (this.paginaNoticias() - 1) * this.PAGE_SIZE;
    return this.noticias().slice(start, start + this.PAGE_SIZE);
  });

  // ── Paginación modal Alerta ─────────────────────────────
  readonly totalPaginasAlerta = computed(() => Math.ceil(this.modalAlertaDatos().length / this.PAGE_SIZE));
  readonly alertaPaginados = computed(() => {
    const start = (this.paginaAlerta() - 1) * this.PAGE_SIZE;
    return this.modalAlertaDatos().slice(start, start + this.PAGE_SIZE);
  });

  // ── Typed getters para plantilla ───────────────────────
  getAlertaComoAlergia(item: AlertaDetalle): AlertaDetalleAlergia {
    return item as AlertaDetalleAlergia;
  }
  getAlertaComoMedicamento(item: AlertaDetalle): AlertaDetalleMedicamento {
    return item as AlertaDetalleMedicamento;
  }
  getAlertaComoExamen(item: AlertaDetalle): AlertaDetalleExamen {
    return item as AlertaDetalleExamen;
  }

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly indicadorAnimationFrames: number[] = [];
  private readonly indicadorAnimationTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  private readonly redAnimationFrames: number[] = [];
  private readonly redAnimationTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  private desktopSidebarCollapsed = false;
  private readonly mobileBreakpoint = 980;
  private readonly indicadoresCacheKey = 'dashboard_indicadores_cache_v2';
  private readonly indicadoresCacheTtlMs = 5 * 60 * 1000;

  readonly nombreUsuario = computed(() => {
    const user = this.usuario();
    if (!user) return '';
    return [user.nombres, user.apellidos].filter(Boolean).join(' ').trim();
  });

  readonly nombreEstablecimiento = computed(() => {
    const u = this.usuario();
    if (!u) return 'CESFAM Pudahuel';
    const estab = u['establecimiento'] as Record<string, unknown> | undefined;
    return (
      this.toStringOrEmpty(u['nombre_establecimiento']) ||
      this.toStringOrEmpty(estab?.['nombre']) ||
      'CESFAM Pudahuel'
    );
  });

  readonly tipoEstablecimiento = computed(() => {
    const u = this.usuario();
    if (!u) return 'Centro de Salud Familiar (CESFAM)';
    const estab = u['establecimiento'] as Record<string, unknown> | undefined;
    const tipo =
      this.toStringOrEmpty(u['tipo_establecimiento']) ||
      this.toStringOrEmpty(estab?.['tipo']);
    if (tipo.toUpperCase() === 'CESFAM') return 'Centro de Salud Familiar (CESFAM)';
    if (tipo.toUpperCase() === 'HOSPITAL') return 'Hospital Público';
    if (tipo.toUpperCase() === 'SAPU') return 'Servicio de Atención Primaria (SAPU)';
    if (tipo.toUpperCase() === 'CLINICA') return 'Clínica de Salud';
    return tipo || 'Centro de Salud';
  });

  readonly ubicacionEstablecimiento = computed(() => {
    const u = this.usuario();
    if (!u) return 'Pudahuel, Santiago';
    const estab = u['establecimiento'] as Record<string, unknown> | undefined;
    const comuna = this.toStringOrEmpty(u['comuna_establecimiento']) || this.toStringOrEmpty(estab?.['comuna']);
    const dir = this.toStringOrEmpty(u['direccion_establecimiento']) || this.toStringOrEmpty(estab?.['direccion']);
    return [dir, comuna].filter(Boolean).join(', ') || 'Pudahuel';
  });

  readonly menuHierarchy = computed<MenuNode[]>(() => {
    const items = this.menuItems();
    const grouped = new Map<string, MenuItem[]>();

    for (const item of items) {
      const parentKey = this.parentKey(item.id_menu_padre);
      const bucket = grouped.get(parentKey) ?? [];
      bucket.push(item);
      grouped.set(parentKey, bucket);
    }

    const roots = grouped.get(this.parentKey(null)) ?? [];

    return roots
      .map((root) => ({
        ...root,
        children: (grouped.get(this.parentKey(root.id_menu)) ?? [])
          .slice()
          .sort((a, b) => a.orden - b.orden),
      }))
      .sort((a, b) => a.orden - b.orden);
  });

  readonly opcionesSeguridad = computed(() =>
    this.menuHierarchy().find((item) => item.nombre.toLowerCase() === 'seguridad')?.children ?? [],
  );

  constructor(
    private readonly menuApiService: MenuApiService,
    private readonly indicadoresApiService: IndicadoresApiService,
    private readonly interoperabilidadApiService: InteroperabilidadApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    this.loadUserData();
    this.loadMenu();
    this.loadIndicadores();
    this.loadInteroperabilidad();
    this.loadPanels();
  }

  ngOnDestroy(): void {
    this.clearTransitionTimer();
    this.clearIndicadoresAnimations();
    this.clearRedAnimations();
  }

  private loadUserData(): void {
    const usuarioJson = localStorage.getItem('usuario_sesion');
    if (usuarioJson) {
      try {
        const rawUsuario = JSON.parse(usuarioJson) as Record<string, unknown>;
        this.usuario.set(this.normalizeUsuario(rawUsuario));
      } catch (error) {
        console.error('Error parsing usuario_sesion:', error);
        this.errorMessage.set('Error al cargar datos del usuario');
      }
    }
  }

  private normalizeUsuario(rawUsuario: Record<string, unknown>): Usuario {
    const rol = (rawUsuario['rol'] ?? rawUsuario['perfil']) as Record<string, unknown> | undefined;
    const estab = rawUsuario['establecimiento'] as Record<string, unknown> | undefined;

    const idRol =
      this.toStringOrEmpty(rawUsuario['id_rol']) ||
      this.toStringOrEmpty(rawUsuario['idRol']) ||
      this.toStringOrEmpty(rawUsuario['rol_id']) ||
      this.toStringOrEmpty(rawUsuario['id_rol_fk']) ||
      this.toStringOrEmpty(rawUsuario['idrol']) ||
      this.toStringOrEmpty(rol?.['id_rol']) ||
      this.toStringOrEmpty(rol?.['idRol']) ||
      this.toStringOrEmpty(rol?.['rol_id']);

    return {
      ...rawUsuario,
      id_usuario: this.toStringOrEmpty(rawUsuario['id_usuario']),
      nombres: this.toStringOrEmpty(rawUsuario['nombres']),
      apellidos: this.toStringOrEmpty(rawUsuario['apellidos']),
      id_rol: idRol,
      nombre_rol: this.toStringOrEmpty(rawUsuario['nombre_rol']) ||
        this.toStringOrEmpty(rol?.['nombre']),
      nombre_establecimiento: this.toStringOrEmpty(rawUsuario['nombre_establecimiento']) || this.toStringOrEmpty(estab?.['nombre']),
      tipo_establecimiento: this.toStringOrEmpty(rawUsuario['tipo_establecimiento']) || this.toStringOrEmpty(estab?.['tipo']),
      comuna_establecimiento: this.toStringOrEmpty(rawUsuario['comuna_establecimiento']) || this.toStringOrEmpty(estab?.['comuna']),
      direccion_establecimiento: this.toStringOrEmpty(rawUsuario['direccion_establecimiento']) || this.toStringOrEmpty(estab?.['direccion']),
    } as Usuario;
  }

  private toStringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private parentKey(parentId: string | null): string {
    return parentId && parentId.trim().length > 0 ? parentId : '__root__';
  }

  private loadMenu(): void {
    const user = this.usuario();
    const token = localStorage.getItem('access_token') ?? '';

    this.errorMessage.set('');
    this.loading.set(true);
    if (token) {
      this.menuApiService.getMenuByToken(token).subscribe({
        next: (items) => {
          this.menuItems.set(items);
          this.setDefaultOpenSections(items);
          this.errorMessage.set('');
          if (!items.length) {
            this.errorMessage.set('No hay opciones de menú para este perfil.');
          }
          this.loading.set(false);
        },
        error: () => {
          this.loadMenuByRoleFallback(user?.nombre_rol ?? '');
        }
      });
      return;
    }

    this.loadMenuByRoleFallback(user?.nombre_rol ?? '');
  }

  private loadMenuByRoleFallback(nombreRol: string): void {
    if (!nombreRol) {
      this.errorMessage.set('No se pudo obtener el rol del usuario');
      this.loading.set(false);
      return;
    }

    this.menuApiService.getMenuByRoleName(nombreRol).subscribe({
      next: (items) => {
        this.menuItems.set(items);
        this.setDefaultOpenSections(items);
        this.errorMessage.set('');
        if (!items.length) {
          this.errorMessage.set('No hay opciones de menú para este perfil.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar el menú');
        this.loading.set(false);
      }
    });
  }

  private loadIndicadores(): void {
    const cachedRows = this.readIndicadoresCache();
    if (cachedRows.length > 0) {
      const orderedCached = cachedRows
        .slice()
        .sort((a, b) => a.orden - b.orden);
      this.indicadores.set(orderedCached);
      this.startIndicadoresCountAnimation(orderedCached);
      this.indicadoresLoading.set(false);
    } else {
      this.indicadoresLoading.set(true);
    }

    this.indicadoresApiService.obtenerIndicadores(1).subscribe({
      next: (rows) => {
        const orderedRows = rows
          .slice()
          .sort((a, b) => a.orden - b.orden);

        this.indicadores.set(orderedRows);
        this.startIndicadoresCountAnimation(orderedRows);
        this.writeIndicadoresCache(orderedRows);
        this.indicadoresLoading.set(false);
      },
      error: (error) => {
        if (!cachedRows.length) {
          this.indicadores.set([]);
          this.indicadoresAnimados.set({});
        }
        this.indicadoresLoading.set(false);
      },
    });
  }

  private readIndicadoresCache(): Indicador[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.indicadoresCacheKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as { ts?: number; data?: Indicador[] };
      if (!parsed.ts || !Array.isArray(parsed.data)) {
        return [];
      }

      if (Date.now() - parsed.ts > this.indicadoresCacheTtlMs) {
        return [];
      }

      return parsed.data;
    } catch {
      return [];
    }
  }

  private writeIndicadoresCache(rows: Indicador[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(
        this.indicadoresCacheKey,
        JSON.stringify({ ts: Date.now(), data: rows }),
      );
    } catch {
      // Ignore quota/storage errors and keep runtime path fast.
    }
  }

  private startIndicadoresCountAnimation(rows: Indicador[]): void {
    this.clearIndicadoresAnimations();

    const initialState: Record<number, number> = {};
    for (const row of rows) {
      initialState[row.orden] = 0;
    }
    this.indicadoresAnimados.set(initialState);

    rows.forEach((row, index) => {
      const delayMs = 60 * index;
      const timeoutId = setTimeout(() => {
        const durationMs = 820 + index * 80;
        const start = performance.now();

        const animate = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const nextValue = Math.round(row.valor * eased);

          this.indicadoresAnimados.update((current) => ({
            ...current,
            [row.orden]: nextValue,
          }));

          if (progress < 1) {
            const frameId = requestAnimationFrame(animate);
            this.indicadorAnimationFrames.push(frameId);
          }
        };

        const frameId = requestAnimationFrame(animate);
        this.indicadorAnimationFrames.push(frameId);
      }, delayMs);

      this.indicadorAnimationTimeouts.push(timeoutId);
    });
  }

  private clearIndicadoresAnimations(): void {
    while (this.indicadorAnimationTimeouts.length) {
      const timeoutId = this.indicadorAnimationTimeouts.pop();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    while (this.indicadorAnimationFrames.length) {
      const frameId = this.indicadorAnimationFrames.pop();
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    }
  }

  private setDefaultOpenSections(items: MenuItem[]): void {
    const states: Record<string, boolean> = {};
    const firstParent = items
      .filter((item) => item.es_padre)
      .sort((a, b) => a.orden - b.orden)[0];

    if (firstParent) {
      states[firstParent.id_menu] = true;
    }

    this.openSections.set(states);
  }

  toggleSection(idMenu: string): void {
    this.openSections.update((current) => ({
      ...current,
      [idMenu]: !current[idMenu],
    }));
  }

  isSectionOpen(idMenu: string): boolean {
    return !!this.openSections()[idMenu];
  }

  isRouteActive(route: string | null | undefined): boolean {
    return !!route && this.activeMenuRoute() === route.trim();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update((current) => !current);
  }

  @HostListener('document:click')
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);

    if (!this.isMobile()) {
      this.desktopSidebarCollapsed = next;
    }
  }

  closeSidebarOnMobile(): void {
    if (this.isMobile()) {
      this.sidebarCollapsed.set(true);
    }
  }

  getMenuIcon(nombre: string, isParent: boolean): string {
    const key = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const map: Record<string, string> = {
      dashboard: 'bi-house-door-fill',
      seguridad: 'bi-shield-lock',
      usuarios: 'bi-people',
      roles: 'bi-person-badge',
      menus: 'bi-list-ul',
      'mantenedor de imagenes': 'bi-gear-fill',
      'gestion clinica': 'bi-hospital',
      pacientes: 'bi-person-vcard',
      atenciones: 'bi-clipboard2-pulse',
      diagnosticos: 'bi-activity',
      alergias: 'bi-shield-exclamation',
      medicamentos: 'bi-capsule-pill',
      examenes: 'bi-clipboard2-check',
      'observaciones clinicas': 'bi-journal-medical',
      interoperabilidad: 'bi-diagram-3',
      'recursos fhir': 'bi-database',
      integraciones: 'bi-plug',
      auditoria: 'bi-journal-check',
      'auditoria de accesos': 'bi-fingerprint',
    };

    return map[key] ?? (isParent ? 'bi-folder2-open' : 'bi-dot');
  }

  getDisplayMenuName(nombre: string): string {
    const key = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return key === 'dashboard' ? 'Inicio' : nombre;
  }

  formatIndicadorValor(valor: number): string {
    return new Intl.NumberFormat('es-CL').format(valor);
  }

  getIndicadorValorAnimado(item: Indicador): number {
    const valores = this.indicadoresAnimados();
    return valores[item.orden] ?? item.valor;
  }

  private loadInteroperabilidad(): void {
    this.interoperabilidadLoading.set(true);
    this.interoperabilidadApiService.obtenerResumen().subscribe({
      next: (data) => {
        this.interoperabilidad.set(data);
        this.startRedCountAnimation(data.red);
        this.interoperabilidadLoading.set(false);
      },
      error: (err) => {
        this.interoperabilidadLoading.set(false);
      },
    });
  }

  private loadPanels(): void {
    this.panelsLoading.set(true);

    this.indicadoresApiService.obtenerNoticias().subscribe({
      next: (data) => this.noticias.set(data),
      error: () => {},
    });

    this.indicadoresApiService.obtenerRedEstado().subscribe({
      next: (data) => this.redEstado.set(data),
      error: () => {},
    });

    this.indicadoresApiService.obtenerAlertasClinicas().subscribe({
      next: (data) => {
        this.alertasClinicas.set(data);
        this.panelsLoading.set(false);
      },
      error: () => this.panelsLoading.set(false),
    });
  }

  formatFechaNoticia(fechaStr: string): string {
    const d = new Date(fechaStr);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private startRedCountAnimation(nodos: RedNodo[]): void {
    this.clearRedAnimations();
    const initial: Record<number, number> = {};
    for (const n of nodos) initial[n.orden] = 0;
    this.redAnimados.set(initial);

    nodos.forEach((nodo, index) => {
      const timeoutId = setTimeout(() => {
        const durationMs = 750 + index * 60;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          this.redAnimados.update(cur => ({ ...cur, [nodo.orden]: Math.round(nodo.valor * eased) }));
          if (progress < 1) {
            const fid = requestAnimationFrame(animate);
            this.redAnimationFrames.push(fid);
          }
        };
        const fid = requestAnimationFrame(animate);
        this.redAnimationFrames.push(fid);
      }, 80 * index);
      this.redAnimationTimeouts.push(timeoutId);
    });
  }

  private clearRedAnimations(): void {
    while (this.redAnimationTimeouts.length) { const t = this.redAnimationTimeouts.pop(); if (t) clearTimeout(t); }
    while (this.redAnimationFrames.length) { const f = this.redAnimationFrames.pop(); if (f !== undefined) cancelAnimationFrame(f); }
  }

  getRedValorAnimado(nodo: RedNodo): number {
    return this.redAnimados()[nodo.orden] ?? nodo.valor;
  }

  getRecursoFhirIcono(codigo: string): string {
    const map: Record<string, string> = {
      Patient: 'bi-person',
      Condition: 'bi-heart-pulse',
      AllergyIntolerance: 'bi-shield-exclamation',
      MedicationStatement: 'bi-capsule-pill',
      Observation: 'bi-activity',
      Encounter: 'bi-clipboard2-pulse',
      DiagnosticReport: 'bi-clipboard2-check',
      Practitioner: 'bi-person-badge',
    };
    return map[codigo] ?? 'bi-database';
  }

  getEstablecimientoIcono(tipo: string): string {
    const map: Record<string, string> = {
      HOSPITAL: 'bi-hospital',
      CESFAM: 'bi-buildings-fill',
      SAPU: 'bi-bandaid-fill',
      SAR: 'bi-bandaid-fill',
      LABORATORIO: 'bi-flask-fill',
    };
    return map[tipo?.toUpperCase()] ?? 'bi-building';
  }

  getBarraAncho(valor: number, max: number): string {
    if (!max || max === 0) return '4%';
    const pct = Math.max(4, Math.round((valor / max) * 100));
    return pct + '%';
  }

  getRecursoFhirMax(recursos: RecursoFhir[]): number {
    return recursos.length > 0 ? Math.max(...recursos.map(r => r.total_uso)) : 1;
  }

  getRedDotTop(index: number): string {
    // Alineados con los puntos verdes de la imagen (recortada 1357x890)
    const tops = ['10%', '37%', '60%', '87%'];
    return tops[index] ?? '50%';
  }

  getVariacionValor(variacion: string): string {
    if (!variacion) return '';
    const texto = variacion.trim();
    // Extrae el porcentaje (ej: "+3,45%", "-7.14%")
    const match = texto.match(/^[+-]?\d+(?:[.,]\d+)?%/);
    return match?.[0] ?? '';
  }

  getVariacionTexto(variacion: string): string {
    if (!variacion) return '';
    const valor = this.getVariacionValor(variacion);
    if (!valor) {
      return variacion;
    }
    // Retorna el texto después del porcentaje (ej: " respecto al último registro")
    const resto = variacion.replace(valor, '').trim();
    return resto ? ' ' + resto : '';
  }

  onPrimaryMenuClick(item: MenuNode): void {
    if (item.children.length > 0) {
      const shouldOpenSidebar = this.sidebarCollapsed();
      if (shouldOpenSidebar) {
        this.sidebarCollapsed.set(false);
        if (!this.isMobile()) {
          this.desktopSidebarCollapsed = false;
        }
      }

      this.toggleSection(item.id_menu);
      if (item.nombre.toLowerCase() === 'seguridad') {
        this.activeMenuRoute.set(null);
        this.opcionSeguridadActiva.set('usuarios');
        this.transitionToComponent('seguridad');
        this.closeSidebarOnMobile();
      } else if (item.nombre.toLowerCase() === 'gestión clínica' || item.nombre.toLowerCase() === 'gestion clinica') {
        this.activeMenuRoute.set('/pacientes');
        this.transitionToComponent('pacientes');
        this.closeSidebarOnMobile();
      }
      return;
    }

    this.onMenuClick(item);
  }

  onMenuClick(item: MenuItem): void {
    if (!item.ruta) {
      return;
    }

    const route = item.ruta.trim();
    const nameLower = (item.nombre || '').trim().toLowerCase();
    this.activeMenuRoute.set(route);

    if (route === '/pacientes' || nameLower === 'pacientes' || nameLower.includes('paciente')) {
      this.pestanaPacientesInicial.set('pacientes');
      this.transitionToComponent('pacientes');
      this.closeSidebarOnMobile();
      return;
    }

    if (route === '/atenciones' || nameLower === 'atenciones' || nameLower.includes('atencion')) {
      this.pestanaPacientesInicial.set('atenciones');
      this.transitionToComponent('pacientes');
      this.closeSidebarOnMobile();
      return;
    }

    const nombreClinico = nameLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const pestanaClinica: TabClinica | null =
      route.includes('diagnost') || nombreClinico.includes('diagnost') ? 'diagnosticos' :
      route.includes('alerg') || nombreClinico.includes('alerg') ? 'alergias' :
      route.includes('medicament') || nombreClinico.includes('medicament') ? 'medicamentos' :
      route.includes('examen') || nombreClinico.includes('examen') ? 'examenes' :
      route.includes('observacion') || nombreClinico.includes('observacion') ? 'observaciones' :
      null;

    if (pestanaClinica) {
      this.pestanaPacientesInicial.set(pestanaClinica);
      this.transitionToComponent('pacientes');
      this.closeSidebarOnMobile();
      return;
    }
    
    if (route === '/seguridad/mantenedor-imagenes') {
      this.opcionSeguridadActiva.set('mantenedor-imagenes');
      this.transitionToComponent('seguridad');
      this.closeSidebarOnMobile();
      return;
    }

    if (route === '/seguridad/usuarios') {
      this.opcionSeguridadActiva.set('usuarios');
      this.transitionToComponent('seguridad');
      this.closeSidebarOnMobile();
      return;
    }

    if (route === '/dashboard') {
      this.transitionToComponent(null);
      this.closeSidebarOnMobile();
      return;
    }

    Swal.fire({
      icon: 'info',
      title: 'Módulo en construcción',
      text: `La opción "${item.nombre}" estará disponible pronto.`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0b4aa8',
      background: 'rgba(255, 255, 255, 0.96)',
    });

    this.closeSidebarOnMobile();
  }

  seleccionarOpcionSeguridad(option: MenuItem): void {
    this.onMenuClick(option);
  }

  private updateViewportState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const mobile = window.innerWidth <= this.mobileBreakpoint;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);

    if (mobile && !wasMobile) {
      this.sidebarCollapsed.set(true);
      return;
    }

    if (!mobile && wasMobile) {
      this.sidebarCollapsed.set(this.desktopSidebarCollapsed);
    }
  }

  private transitionToComponent(nextComponent: string | null): void {
    if (this.componentActivo() === nextComponent && this.contentAnimationState() === 'ready') {
      return;
    }

    this.clearTransitionTimer();
    this.contentAnimationState.set('leaving');

    this.transitionTimer = window.setTimeout(() => {
      this.componentActivo.set(nextComponent);
      this.contentAnimationState.set('entering');

      this.transitionTimer = window.setTimeout(() => {
        this.contentAnimationState.set('ready');
        this.transitionTimer = null;
      }, 360);
    }, 170);
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  async logout(): Promise<void> {
    const result = await Swal.fire({
      title: 'Desea cerrar sesión?',
      text: 'Tu sesión actual se cerrará y volverás al inicio de sesión.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b4aa8',
      cancelButtonColor: '#6b7280',
      background: 'rgba(255, 255, 255, 0.96)',
      backdrop: 'rgba(8, 33, 73, 0.45)',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario_sesion');
    this.router.navigateByUrl('/login');
  }

  // ── Modales ─────────────────────────────────────────────

  abrirModalFhir(): void {
    this.paginaFhir.set(1);
    this.modalFhirAbierto.set(true);
    this.modalFhirCargando.set(true);
    this.interoperabilidadApiService.obtenerRecursosFhir().subscribe({
      next: (data) => { this.modalFhirDatos.set(data); this.modalFhirCargando.set(false); },
      error: () => this.modalFhirCargando.set(false),
    });
  }

  abrirModalIntegraciones(): void {
    this.paginaInteg.set(1);
    this.modalIntegAbierto.set(true);
    this.modalIntegCargando.set(true);
    this.interoperabilidadApiService.obtenerIntegraciones().subscribe({
      next: (data) => { this.modalIntegDatos.set(data); this.modalIntegCargando.set(false); },
      error: () => this.modalIntegCargando.set(false),
    });
  }

  abrirModalNoticias(): void {
    this.paginaNoticias.set(1);
    this.modalNoticiasAbierto.set(true);
  }

  abrirModalAlerta(alerta: AlertaClinicaItem): void {
    const tipoMap: Record<number, string> = { 1: 'alergias', 2: 'medicamentos', 3: 'examenes' };
    const tipo = tipoMap[alerta.orden] ?? '';
    if (!tipo) return;
    this.paginaAlerta.set(1);
    this.modalAlertaTitulo.set(alerta.nombre);
    this.modalAlertaTipo.set(tipo);
    this.modalAlertaAbierto.set(true);
    this.modalAlertaCargando.set(true);
    this.indicadoresApiService.obtenerDetalleAlerta(tipo).subscribe({
      next: (data) => { this.modalAlertaDatos.set(data); this.modalAlertaCargando.set(false); },
      error: () => this.modalAlertaCargando.set(false),
    });
  }

  cerrarModales(): void {
    this.modalFhirAbierto.set(false);
    this.modalIntegAbierto.set(false);
    this.modalNoticiasAbierto.set(false);
    this.modalAlertaAbierto.set(false);
  }

  irPaginaFhir(dir: number): void {
    const next = this.paginaFhir() + dir;
    if (next >= 1 && next <= this.totalPaginasFhir()) this.paginaFhir.set(next);
  }

  irPaginaInteg(dir: number): void {
    const next = this.paginaInteg() + dir;
    if (next >= 1 && next <= this.totalPaginasInteg()) this.paginaInteg.set(next);
  }

  irPaginaNoticias(dir: number): void {
    const next = this.paginaNoticias() + dir;
    if (next >= 1 && next <= this.totalPaginasNoticias()) this.paginaNoticias.set(next);
  }

  irPaginaAlerta(dir: number): void {
    const next = this.paginaAlerta() + dir;
    if (next >= 1 && next <= this.totalPaginasAlerta()) this.paginaAlerta.set(next);
  }
}
