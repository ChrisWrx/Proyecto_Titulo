import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  UsuariosApiService,
  Usuario,
  AreaUsuario,
  RolUsuario,
  EstablecimientoSaludItem,
  GuardarUsuario,
} from '../../core/services/usuarios-api.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  private readonly areasPorRol: Record<string, string[]> = {
    ADMIN: ['Administracion'],
    AUDITOR: ['Auditoria y Calidad'],
    ENFERMERIA: ['Enfermeria'],
    INTEGRACION: ['Anatomia Patologica', 'Integracion de Sistemas'],
    MEDICO: ['Medicina General'],
    SUPERVISOR: ['Supervision Clinica'],
    TENS: ['Anatomia Patologica', 'Tecnico en Enfermeria'],
  };

  readonly usuarios = signal<Usuario[]>([]);
  readonly loading = signal(false);
  readonly textoBusqueda = signal('');

  readonly paginaActual = signal(1);
  private readonly PAGE_SIZE = 5;

  readonly usuariosFiltrados = computed(() => {
    const criterio = this.textoBusqueda().trim().toLowerCase();
    if (!criterio) return this.usuarios();

    return this.usuarios().filter((usuario) =>
      [usuario.nombre_completo, usuario.correo, usuario.username, usuario.area, usuario.nombre_rol, usuario.rut_usuario]
        .some((value) => value?.toLowerCase().includes(criterio)),
    );
  });
  readonly totalPaginas = computed(() => Math.ceil(this.usuariosFiltrados().length / this.PAGE_SIZE));
  readonly usuariosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.PAGE_SIZE;
    return this.usuariosFiltrados().slice(inicio, inicio + this.PAGE_SIZE);
  });
  readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

  // Modal
  readonly modalOpen = signal(false);
  readonly modalClosing = signal(false);
  readonly loadingDetalle = signal(false);
  readonly rutEdicion = signal('');
  readonly validandoEdicion = signal(false);
  readonly modalContrasenaOpen = signal(false);
  readonly validandoContrasena = signal(false);
  readonly contrasenaNueva = signal('');
  readonly contrasenaConfirmacion = signal('');

  readonly formEdicion = signal({
    nombreCompleto: '',
    correo: '',
    username: '',
    id_rol: '',
    id_area: '',
  });

  readonly centroSaludSesion = computed(() => {
    const usuarioJson = localStorage.getItem('usuario_sesion');
    if (usuarioJson) {
      try {
        const u = JSON.parse(usuarioJson) as Record<string, unknown>;
        const estab = u['establecimiento'] as Record<string, unknown> | undefined;
        return (
          (typeof u['nombre_establecimiento'] === 'string' ? u['nombre_establecimiento'] : '') ||
          (typeof estab?.['nombre'] === 'string' ? (estab['nombre'] as string) : '') ||
          'SICHCP'
        );
      } catch {
        return 'SICHCP';
      }
    }
    return 'SICHCP';
  });

  // Establecimientos para modal
  readonly establecimientos = signal<EstablecimientoSaludItem[]>([]);
  readonly tipoEstablecimientoSeleccionado = signal<string>('');
  readonly idEstablecimientoSeleccionado = signal<string>('');
  readonly tipoEstablecimientoTexto = signal('');
  readonly establecimientoTexto = signal('');
  readonly tipoEstablecimientoOpen = signal(false);
  readonly establecimientoOpen = signal(false);
  readonly tipoEstablecimientoShowAll = signal(false);
  readonly establecimientoShowAll = signal(false);

  readonly tiposEstablecimientoDisponibles = computed(() => {
    const lista = this.establecimientos();
    const tipos = new Set<string>();
    lista.forEach(e => {
      if (e.tipo) tipos.add(e.tipo);
    });
    const opciones = Array.from(tipos).sort();
    if (this.tipoEstablecimientoShowAll()) return opciones;
    const texto = this.tipoEstablecimientoTexto().trim().toLowerCase();
    return texto ? opciones.filter(tipo => tipo.toLowerCase().includes(texto)) : opciones;
  });

  readonly establecimientosFiltradosPorTipo = computed(() => {
    const tipo = this.tipoEstablecimientoSeleccionado();
    const lista = this.establecimientos();
    if (!tipo) return [];
    const opciones = lista.filter(e => e.tipo === tipo);
    if (this.establecimientoShowAll()) return opciones;
    const texto = this.establecimientoTexto().trim().toLowerCase();
    return texto ? opciones.filter(e => e.nombre.toLowerCase().includes(texto)) : opciones;
  });

  readonly establecimientoDetalleSeleccionado = computed(() => {
    const id = this.idEstablecimientoSeleccionado();
    if (!id) return null;
    return this.establecimientos().find(e => e.id_establecimiento === id) || null;
  });

  readonly direccionManualInput = signal<string>('');

  readonly direccionFinal = computed(() => {
    const estab = this.establecimientoDetalleSeleccionado();
    if (estab && estab.direccion && estab.direccion.trim().length > 0) {
      return estab.direccion;
    }
    return this.direccionManualInput();
  });

  // Modal crear
  readonly modalCrearOpen = signal(false);
  readonly modalCrearClosing = signal(false);
  readonly validandoCrear = signal(false);

  readonly formCrear = signal({
    nombres: '',
    rut: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    correo: '',
    username: '',
    id_area: '',
    id_rol: '',
    password: '',
    confirmPassword: '',
  });

  // Autocomplete área
  readonly areas = signal<AreaUsuario[]>([]);
  readonly areaTexto = signal('');
  readonly areaOpen = signal(false);
  readonly areaShowAll = signal(false);
  readonly areasFiltradas = computed(() => {
    const rol = this.rolTexto().trim().toUpperCase();
    if (rol === 'SUPER_ADMIN') return [];
    const nombresPermitidos = this.areasPorRol[rol] ?? [];
    const areasPermitidas = this.areas().filter((area) => nombresPermitidos.includes(area.nombre));
    if (this.areaShowAll()) return areasPermitidas;
    const txt = this.areaTexto().trim().toLowerCase();
    if (!txt) return areasPermitidas;
    return areasPermitidas.filter((a) => a.nombre.toLowerCase().includes(txt));
  });

  // Autocomplete rol
  readonly roles = signal<RolUsuario[]>([]);
  readonly rolTexto = signal('');
  readonly rolOpen = signal(false);
  readonly rolShowAll = signal(false);
  readonly rolesFiltrados = computed(() => {
    const rolesDisponibles = this.esUsuarioSesionAdmin()
      ? this.roles().filter((r) => r.nombre.trim().toUpperCase() !== 'SUPER_ADMIN')
      : this.roles();
    if (this.rolShowAll()) return rolesDisponibles;
    const txt = this.rolTexto().trim().toLowerCase();
    if (!txt) return rolesDisponibles;
    return rolesDisponibles.filter((r) => r.nombre.toLowerCase().includes(txt));
  });

  constructor(private readonly usuariosApiService: UsuariosApiService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  irAPagina(pagina: number): void {
    this.paginaActual.set(pagina);
  }

  buscarUsuarios(texto: string): void {
    this.textoBusqueda.set(texto);
    this.paginaActual.set(1);
  }

  getIconoRol(nombreRol: string | null | undefined): string {
    switch ((nombreRol ?? '').trim().toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'bi-shield-lock-fill';
      case 'MEDICO':
        return 'bi-heart-pulse-fill';
      case 'ENFERMERIA':
        return 'bi-bandaid-fill';
      case 'TENS':
        return 'bi-activity';
      case 'SUPERVISOR':
        return 'bi-clipboard2-check-fill';
      case 'AUDITOR':
        return 'bi-clipboard2-data-fill';
      case 'INTEGRACION':
        return 'bi-diagram-3-fill';
      default:
        return 'bi-person-badge-fill';
    }
  }

  private esUsuarioSesionSuperAdmin(): boolean {
    const usuarioJson = localStorage.getItem('usuario_sesion');
    if (usuarioJson) {
      try {
        const u = JSON.parse(usuarioJson) as Record<string, unknown>;
        const nombreRol = typeof u['nombre_rol'] === 'string' ? u['nombre_rol'].toUpperCase() : '';
        const rolObj = u['rol'] as Record<string, unknown> | undefined;
        const nombreRolObj = typeof rolObj?.['nombre'] === 'string' ? (rolObj['nombre'] as string).toUpperCase() : '';
        return nombreRol === 'SUPER_ADMIN' || nombreRolObj === 'SUPER_ADMIN';
      } catch {
        return false;
      }
    }
    return false;
  }

  private esUsuarioSesionAdmin(): boolean {
    const usuarioJson = localStorage.getItem('usuario_sesion');
    if (!usuarioJson) return false;
    try {
      const u = JSON.parse(usuarioJson) as Record<string, unknown>;
      const nombreRol = typeof u['nombre_rol'] === 'string' ? u['nombre_rol'].trim().toUpperCase() : '';
      const rolObj = u['rol'] as Record<string, unknown> | undefined;
      const nombreRolObj = typeof rolObj?.['nombre'] === 'string'
        ? (rolObj['nombre'] as string).trim().toUpperCase()
        : '';
      return nombreRol === 'ADMIN' || nombreRolObj === 'ADMIN';
    } catch {
      return false;
    }
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    const isSuperAdmin = this.esUsuarioSesionSuperAdmin();
    const idEstablecimiento = isSuperAdmin ? undefined : this.getIdEstablecimientoSesion();
    this.usuariosApiService.listarUsuarios(idEstablecimiento).subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.paginaActual.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los usuarios.',
          confirmButtonColor: '#0b4aa8',
        });
      },
    });
  }

  editarUsuario(usuario: Usuario): void {
    if (!usuario.rut_usuario) {
      void Swal.fire({
        icon: 'warning',
        title: 'Sin RUT',
        text: 'Este usuario no tiene RUT registrado.',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }
    this.formEdicion.set({ nombreCompleto: '', correo: '', username: '', id_rol: '', id_area: '' });
    this.rutEdicion.set(usuario.rut_usuario);
    this.areaTexto.set('');
    this.rolTexto.set('');
    this.modalClosing.set(false);
    this.modalOpen.set(true);
    this.cargarAreasYRoles();
    this.cargarDetalleUsuario(usuario.rut_usuario);
  }

  cerrarModal(): void {
    this.modalClosing.set(true);
    window.setTimeout(() => {
      this.modalOpen.set(false);
      this.modalClosing.set(false);
    }, 260);
  }

  abrirModalContrasena(): void {
    this.contrasenaNueva.set('');
    this.contrasenaConfirmacion.set('');
    this.validandoContrasena.set(false);
    this.modalContrasenaOpen.set(true);
  }

  cerrarModalContrasena(): void {
    this.modalContrasenaOpen.set(false);
    this.validandoContrasena.set(false);
  }

  contrasenasCambioNoCoinciden(): boolean {
    const password = this.contrasenaNueva();
    const confirmation = this.contrasenaConfirmacion();
    return !!password && !!confirmation && password !== confirmation;
  }

  async cambiarContrasena(): Promise<void> {
    const password = this.contrasenaNueva();
    const confirmation = this.contrasenaConfirmacion();
    this.validandoContrasena.set(true);

    if (!password || !confirmation) {
      await this.mostrarCamposIncompletos(['Ingrese contraseña', 'Repita contraseña']);
      return;
    }

    if (password !== confirmation) {
      await Swal.fire({
        icon: 'warning',
        title: 'Contraseñas no coinciden',
        text: 'La contraseña ingresada y su confirmación deben ser idénticas.',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }

    const confirmationResult = await Swal.fire({
      icon: 'question',
      title: '¿Cambiar contraseña?',
      text: `Se modificará la contraseña del usuario ${this.formEdicion().username}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b4aa8',
    });

    if (!confirmationResult.isConfirmed) return;

    this.usuariosApiService.cambiarContrasena(this.rutEdicion(), password).subscribe({
      next: (result) => {
        if (!result.actualizado) {
          void Swal.fire({
            icon: 'error',
            title: 'No se pudo cambiar',
            text: 'No se encontró un usuario activo con ese RUT.',
            confirmButtonColor: '#0b4aa8',
          });
          return;
        }

        this.cerrarModalContrasena();
        void Swal.fire({
          icon: 'success',
          title: 'Contraseña modificada',
          text: `Se ha modificado la contraseña del Usuario: ${result.username ?? this.formEdicion().username}.`,
          confirmButtonColor: '#0b4aa8',
        });
      },
      error: () => {
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo modificar la contraseña.',
          confirmButtonColor: '#0b4aa8',
        });
      },
    });
  }

  abrirModalCrear(): void {
    this.formCrear.set({
      nombres: '',
      rut: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      correo: '',
      username: '',
      id_area: '',
      id_rol: '',
      password: '',
      confirmPassword: '',
    });
    this.validandoCrear.set(false);
    this.areaTexto.set('');
    this.rolTexto.set('');
    this.tipoEstablecimientoSeleccionado.set('');
    this.idEstablecimientoSeleccionado.set('');
    this.tipoEstablecimientoTexto.set('');
    this.establecimientoTexto.set('');
    this.direccionManualInput.set('');
    this.modalCrearClosing.set(false);
    this.modalCrearOpen.set(true);
    this.cargarAreasYRoles();
    this.cargarEstablecimientos();
  }

  cerrarModalCrear(): void {
    this.modalCrearClosing.set(true);
    window.setTimeout(() => {
      this.modalCrearOpen.set(false);
      this.modalCrearClosing.set(false);
    }, 260);
  }

  private getIdEstablecimientoSesion(): string | undefined {
    const usuarioJson = localStorage.getItem('usuario_sesion');
    if (usuarioJson) {
      try {
        const u = JSON.parse(usuarioJson) as Record<string, unknown>;
        const estab = u['establecimiento'] as Record<string, unknown> | undefined;
        return (
          (typeof u['id_establecimiento'] === 'string' ? u['id_establecimiento'] : undefined) ||
          (typeof estab?.['id_establecimiento'] === 'string' ? (estab['id_establecimiento'] as string) : undefined)
        );
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  onTipoEstablecimientoChange(tipo: string): void {
    this.tipoEstablecimientoSeleccionado.set(tipo);
    this.idEstablecimientoSeleccionado.set('');
    this.tipoEstablecimientoTexto.set(tipo);
    this.establecimientoTexto.set('');
  }

  onEstablecimientoChange(id: string): void {
    this.idEstablecimientoSeleccionado.set(id);
    this.direccionManualInput.set('');
    this.establecimientoTexto.set(this.establecimientos().find(e => e.id_establecimiento === id)?.nombre ?? '');
  }

  onTipoEstablecimientoInput(valor: string): void {
    this.tipoEstablecimientoTexto.set(valor);
    this.tipoEstablecimientoShowAll.set(false);
    this.tipoEstablecimientoOpen.set(true);
    this.tipoEstablecimientoSeleccionado.set('');
    this.idEstablecimientoSeleccionado.set('');
    this.establecimientoTexto.set('');
  }

  toggleTipoEstablecimientoDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.tipoEstablecimientoOpen();
    this.tipoEstablecimientoShowAll.set(opening);
    this.tipoEstablecimientoOpen.set(opening);
    this.establecimientoOpen.set(false);
  }

  onTipoEstablecimientoBlur(): void {
    setTimeout(() => this.tipoEstablecimientoOpen.set(false), 120);
  }

  seleccionarTipoEstablecimiento(tipo: string): void {
    this.onTipoEstablecimientoChange(tipo);
    this.tipoEstablecimientoShowAll.set(false);
    this.tipoEstablecimientoOpen.set(false);
  }

  onEstablecimientoInput(valor: string): void {
    this.establecimientoTexto.set(valor);
    this.establecimientoShowAll.set(false);
    this.establecimientoOpen.set(true);
    this.idEstablecimientoSeleccionado.set('');
  }

  toggleEstablecimientoDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.establecimientoOpen();
    this.establecimientoShowAll.set(opening);
    this.establecimientoOpen.set(opening);
    this.tipoEstablecimientoOpen.set(false);
  }

  onEstablecimientoBlur(): void {
    setTimeout(() => this.establecimientoOpen.set(false), 120);
  }

  seleccionarEstablecimiento(establecimiento: EstablecimientoSaludItem): void {
    this.onEstablecimientoChange(establecimiento.id_establecimiento);
    this.establecimientoShowAll.set(false);
    this.establecimientoOpen.set(false);
  }

  onDireccionManualInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.direccionManualInput.set(input.value);
    }
  }

  crearUsuario(): void {
    const formulario = this.formCrear();
    this.validandoCrear.set(true);

    const camposVacios: string[] = [];
    if (!formulario.nombres.trim()) camposVacios.push('Nombres');
    if (!formulario.rut.trim()) camposVacios.push('RUT');
    if (!formulario.apellidoPaterno.trim()) camposVacios.push('Apellido paterno');
    if (!formulario.apellidoMaterno.trim()) camposVacios.push('Apellido materno');
    if (!formulario.correo.trim()) camposVacios.push('Correo');
    if (!formulario.username.trim()) camposVacios.push('Nombre de usuario');
    if (!this.areaEsValida(formulario.id_area, this.rolTexto())) camposVacios.push('Área');
    if (!formulario.id_rol) camposVacios.push('Rol');
    if (!this.esSuperAdmin() && !this.idEstablecimientoSeleccionado()) {
      camposVacios.push('Establecimiento de Salud');
    }
    if (!formulario.password.trim()) camposVacios.push('Contraseña');
    if (!formulario.confirmPassword.trim()) camposVacios.push('Repetir contraseña');

    if (camposVacios.length > 0) {
      void this.mostrarCamposIncompletos(camposVacios);
      return;
    }

    if (formulario.password !== formulario.confirmPassword) {
      void Swal.fire({
        icon: 'warning',
        title: 'Contraseñas no coinciden',
        text: 'La contraseña ingresada y su confirmación deben ser idénticas.',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }

    const datos: GuardarUsuario = {
      nombres: formulario.nombres,
      rut: formulario.rut,
      apellidoPaterno: formulario.apellidoPaterno,
      apellidoMaterno: formulario.apellidoMaterno,
      correo: formulario.correo,
      username: formulario.username,
      id_area: formulario.id_area || undefined,
      id_rol: formulario.id_rol,
      id_establecimiento: this.esSuperAdmin()
        ? undefined
        : (this.idEstablecimientoSeleccionado() || this.getIdEstablecimientoSesion()),
      password: formulario.password,
    };

    this.usuariosApiService.crearUsuario(datos).subscribe({
      next: () => {
        this.cerrarModalCrear();
        this.cargarUsuarios();
        void Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: 'El usuario fue creado correctamente.',
          confirmButtonColor: '#0b4aa8',
        });
      },
      error: () => {
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo crear el usuario.',
          confirmButtonColor: '#0b4aa8',
        });
      },
    });
  }

  onRutInput(valor: string): void {
    const caracteres = valor.toUpperCase().replace(/[^0-9K]/g, '');
    const posicionK = caracteres.indexOf('K');
    const limpio = posicionK >= 0 ? `${caracteres.slice(0, posicionK)}K` : caracteres.slice(0, 9);
    if (!limpio) {
      this.formCrear.update((formulario) => ({ ...formulario, rut: '' }));
      return;
    }

    const cuerpo = limpio.slice(0, -1);
    const digitoVerificador = limpio.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const rutFormateado = cuerpo ? `${cuerpoFormateado}-${digitoVerificador}` : digitoVerificador;

    this.formCrear.update((formulario) => ({ ...formulario, rut: rutFormateado }));
  }

  rutEdicionFormateado(): string {
    const rut = this.rutEdicion().replace(/[.\-]/g, '').toUpperCase();
    if (rut.length < 2) return rut;

    const cuerpo = rut.slice(0, -1);
    const digitoVerificador = rut.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpoFormateado}-${digitoVerificador}`;
  }

  private cargarAreasYRoles(): void {
    if (this.areas().length === 0) {
      this.usuariosApiService.listarAreas().subscribe({
        next: (data) => this.areas.set(data),
        error: () => this.areas.set([]),
      });
    }
    if (this.roles().length === 0) {
      this.usuariosApiService.listarRoles().subscribe({
        next: (data) => this.roles.set(data),
        error: () => this.roles.set([]),
      });
    }
  }

  private cargarEstablecimientos(): void {
    if (this.establecimientos().length === 0) {
      this.usuariosApiService.listarEstablecimientos().subscribe({
        next: (data) => this.establecimientos.set(data || []),
        error: () => this.establecimientos.set([]),
      });
    }
  }

  private cargarDetalleUsuario(rut: string): void {
    this.loadingDetalle.set(true);
    this.usuariosApiService.obtenerUsuarioPorRut(rut).subscribe({
      next: (detalle) => {
        if (detalle) {
          const nombreCompleto = [detalle.nombres_usuario, detalle.apellido_paterno, detalle.apellido_materno]
            .filter(Boolean)
            .join(' ');
          this.formEdicion.set({
            nombreCompleto,
            correo: detalle.correo ?? '',
            username: detalle.username ?? '',
            id_rol: detalle.id_rol ?? '',
            id_area: detalle.id_area ?? '',
          });
          this.areaTexto.set(
            detalle.nombre_rol?.trim().toUpperCase() === 'SUPER_ADMIN'
              ? 'Todas las Áreas'
              : detalle.area ?? '',
          );
          this.rolTexto.set(detalle.nombre_rol ?? '');
          this.tipoEstablecimientoSeleccionado.set(detalle.tipo_establecimiento ?? '');
          this.idEstablecimientoSeleccionado.set(detalle.id_establecimiento ?? '');
          this.tipoEstablecimientoTexto.set(detalle.tipo_establecimiento ?? '');
          this.establecimientoTexto.set(detalle.nombre_establecimiento ?? '');
          this.direccionManualInput.set(detalle.direccion_establecimiento ?? '');
          this.cargarEstablecimientos();
        }
        this.loadingDetalle.set(false);
      },
      error: () => {
        this.loadingDetalle.set(false);
      },
    });
  }

  onAreaInput(valor: string): void {
    this.areaTexto.set(valor);
    this.areaShowAll.set(false);
    this.areaOpen.set(true);
  }

  toggleAreaDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.areaOpen();
    this.areaShowAll.set(opening);
    this.areaOpen.set(opening);
    this.rolOpen.set(false);
    this.rolShowAll.set(false);
  }

  onAreaBlur(): void {
    setTimeout(() => this.areaOpen.set(false), 120);
  }

  seleccionarArea(area: AreaUsuario): void {
    this.areaTexto.set(area.nombre);
    this.areaShowAll.set(false);
    this.formEdicion.update((f) => ({ ...f, id_area: area.id_area }));
    this.formCrear.update((f) => ({ ...f, id_area: area.id_area }));
    this.areaOpen.set(false);
  }

  onRolInput(valor: string): void {
    this.rolTexto.set(valor);
    this.rolShowAll.set(false);
    this.rolOpen.set(true);
  }

  toggleRolDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.rolOpen();
    this.rolShowAll.set(opening);
    this.rolOpen.set(opening);
    this.areaOpen.set(false);
    this.areaShowAll.set(false);
  }

  onRolBlur(): void {
    setTimeout(() => this.rolOpen.set(false), 120);
  }

  seleccionarRol(rol: RolUsuario): void {
    this.rolTexto.set(rol.nombre);
    this.rolShowAll.set(false);
    this.formEdicion.update((f) => ({ ...f, id_rol: rol.id_rol }));
    this.formCrear.update((f) => ({ ...f, id_rol: rol.id_rol }));
    const esSuperAdmin = rol.nombre.trim().toUpperCase() === 'SUPER_ADMIN';
    this.areaTexto.set(esSuperAdmin ? 'Todas las Áreas' : '');
    this.formEdicion.update((f) => ({ ...f, id_area: '' }));
    this.formCrear.update((f) => ({ ...f, id_area: '' }));
    this.rolOpen.set(false);
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.areaOpen.set(false);
    this.rolOpen.set(false);
    this.tipoEstablecimientoOpen.set(false);
    this.establecimientoOpen.set(false);
    this.areaShowAll.set(false);
    this.rolShowAll.set(false);
    this.tipoEstablecimientoShowAll.set(false);
    this.establecimientoShowAll.set(false);
  }

  guardarUsuario(): void {
    const formulario = this.formEdicion();
    this.validandoEdicion.set(true);

    const camposVacios: string[] = [];
    if (!this.areaEsValida(formulario.id_area, this.rolTexto())) camposVacios.push('Área');
    if (!formulario.id_rol) camposVacios.push('Rol');

    if (camposVacios.length > 0) {
      void this.mostrarCamposIncompletos(camposVacios);
      return;
    }

    const datos: GuardarUsuario = {
      id_area: formulario.id_area || undefined,
      id_rol: formulario.id_rol,
      id_establecimiento: this.esSuperAdmin()
        ? undefined
        : (this.idEstablecimientoSeleccionado() || this.getIdEstablecimientoSesion()),
    };

    this.usuariosApiService.actualizarUsuario(this.rutEdicion(), datos).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarUsuarios();
        void Swal.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          text: 'El usuario fue actualizado correctamente.',
          confirmButtonColor: '#0b4aa8',
        });
      },
      error: () => {
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el usuario.',
          confirmButtonColor: '#0b4aa8',
        });
      },
    });
  }

  campoValidoCrear(campo: 'nombres' | 'rut' | 'apellidoPaterno' | 'apellidoMaterno' | 'correo' | 'username' | 'area' | 'rol' | 'password' | 'confirmPassword'): boolean {
    if (!this.validandoCrear()) return false;
    const formulario = this.formCrear();
    if (campo === 'area') return this.areaEsValida(formulario.id_area, this.rolTexto());
    if (campo === 'rol') return !!formulario.id_rol;
    if (campo === 'confirmPassword') return !!formulario.confirmPassword.trim() && formulario.password === formulario.confirmPassword;
    return !!formulario[campo].trim();
  }

  campoInvalidoCrear(campo: 'nombres' | 'rut' | 'apellidoPaterno' | 'apellidoMaterno' | 'correo' | 'username' | 'area' | 'rol' | 'password' | 'confirmPassword'): boolean {
    if (!this.validandoCrear()) return false;
    return !this.campoValidoCrear(campo);
  }

  contrasenasNoCoinciden(): boolean {
    const f = this.formCrear();
    return (
      (this.validandoCrear() || (!!f.password && !!f.confirmPassword)) &&
      f.password !== f.confirmPassword
    );
  }

  campoCentroValido(campo: 'tipo' | 'establecimiento' | 'comuna' | 'direccion'): boolean {
    if (this.esSuperAdmin()) return true;
    const establecimiento = this.establecimientoDetalleSeleccionado();
    if (campo === 'tipo') return !!this.tipoEstablecimientoSeleccionado();
    if (campo === 'establecimiento') return !!this.idEstablecimientoSeleccionado();
    if (campo === 'comuna') return !!establecimiento?.comuna?.trim();
    return !!this.direccionFinal().trim();
  }

  campoCentroInvalido(campo: 'tipo' | 'establecimiento' | 'comuna' | 'direccion'): boolean {
    return this.validandoCrear() && !this.campoCentroValido(campo);
  }

  campoValidoEdicion(campo: 'area' | 'rol'): boolean {
    if (!this.validandoEdicion()) return false;
    return campo === 'area'
      ? !!this.formEdicion().id_area || !!this.areaTexto().trim()
      : !!this.formEdicion().id_rol;
  }

  campoInvalidoEdicion(campo: 'area' | 'rol'): boolean {
    if (!this.validandoEdicion()) return false;
    return !this.campoValidoEdicion(campo);
  }

  esSuperAdmin(): boolean {
    return this.rolTexto().trim().toUpperCase() === 'SUPER_ADMIN';
  }

  private areaEsValida(idArea: string, rol: string): boolean {
    return rol.trim().toUpperCase() === 'SUPER_ADMIN' || !!idArea || !!this.areaTexto().trim();
  }

  private async mostrarCamposIncompletos(camposVacios: string[]): Promise<void> {
    await Swal.fire({
      icon: 'info',
      title: 'Campos incompletos',
      html: `<p>Por favor completa los siguientes campos:</p><ul style="text-align:left;margin-top:0.5rem">${camposVacios.map((campo) => `<li style="color:#0a3a86;font-weight:600">• ${campo}</li>`).join('')}</ul>`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0b4aa8',
    });
  }

  async eliminarUsuario(usuario: Usuario): Promise<void> {
    const confirmacion = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: `Se desactivará el acceso de "${usuario.nombre_completo}".`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b4aa8',
      cancelButtonColor: '#6b7280',
    });

    if (!confirmacion.isConfirmed || !usuario.rut_usuario) return;

    this.usuariosApiService.desactivarUsuario(usuario.rut_usuario).subscribe({
      next: (resultado) => {
        if (!resultado.mensaje.toLowerCase().includes('desactivado')) {
          void Swal.fire({
            icon: 'info',
            title: 'Usuario no desactivado',
            text: resultado.mensaje,
            confirmButtonColor: '#0b4aa8',
          });
          return;
        }

        this.cargarUsuarios();
        void Swal.fire({
          icon: 'success',
          title: 'Usuario eliminado correctamente',
          text: `Se eliminó correctamente el usuario "${usuario.nombre_completo}".`,
          confirmButtonColor: '#0b4aa8',
        });
      },
      error: () => {
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo desactivar el usuario.',
          confirmButtonColor: '#0b4aa8',
        });
      },
    });
  }
}
