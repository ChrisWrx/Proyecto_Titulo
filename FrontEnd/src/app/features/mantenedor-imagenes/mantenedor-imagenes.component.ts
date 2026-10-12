import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BannersApiService, TipoBanner, Banner } from '../../core/services/banners-api.service';

@Component({
  selector: 'app-mantenedor-imagenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mantenedor-shell">
      <div class="mantenedor-container">
        <div class="mantenedor-header">
          <span class="mantenedor-header-icon"><i class="bi bi-images"></i></span>
          <div>
            <h1>Mantenedor de Imágenes</h1>
            <p>Gestiona los banners y carruseles del sistema</p>
          </div>
        </div>

        <div class="section-tabla">
          <div class="card-tabla glass-panel">
            <div class="tabla-header">
              <h2><i class="bi bi-collection-fill tabla-title-icon"></i> Banners registrados</h2>
              <div class="tabla-actions">
                <label class="search-control">
                  <i class="bi bi-search"></i>
                  <input type="search" [ngModel]="textoBusqueda()" (ngModelChange)="buscarBanners($event)" placeholder="Buscar banner" aria-label="Buscar banner" />
                </label>
                <button class="btn-agregar-imagen" type="button" (click)="abrirModalNuevoBanner()">
                  <i class="bi bi-image"></i>
                  Agregar nueva imagen
                </button>
              </div>
            </div>

            <div class="tabla-wrapper">
              <table class="tabla-banners">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Descripción</th>
                    <th>Orden</th>
                    <th>Imagen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (banner of bannersPaginados(); track banner.id_banner) {
                    <tr>
                      <td>{{ banner.tipo_banner }}</td>
                      <td>{{ banner.titulo }}</td>
                      <td>{{ banner.descripcion }}</td>
                      <td class="text-center">{{ banner.orden }}</td>
                      <td class="text-center">
                        <img
                          [src]="banner.url_imagen"
                          [alt]="banner.nombre_imagen"
                          class="tabla-img"
                        />
                      </td>
                      <td class="acciones">
                        <button
                          class="btn-icon btn-editar"
                          (click)="editarBanner(banner)"
                          title="Editar"
                          type="button"
                        >
                          <i class="bi bi-pencil-square"></i>
                        </button>
                        <button
                          class="btn-icon btn-eliminar"
                          (click)="eliminarBanner(banner.id_banner)"
                          title="Eliminar"
                          type="button"
                        >
                          <i class="bi bi-trash3"></i>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              @if (totalPaginas() > 1) {
                <div class="paginador">
                  <button
                    class="btn-pagina"
                    type="button"
                    [disabled]="paginaActual() === 1"
                    (click)="irAPagina(paginaActual() - 1)"
                  >
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  @for (pagina of paginas(); track pagina) {
                    <button
                      class="btn-pagina"
                      type="button"
                      [class.activa]="pagina === paginaActual()"
                      (click)="irAPagina(pagina)"
                    >
                      {{ pagina }}
                    </button>
                  }
                  <button
                    class="btn-pagina"
                    type="button"
                    [disabled]="paginaActual() === totalPaginas()"
                    (click)="irAPagina(paginaActual() + 1)"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
              }

              @if (bannersFiltrados().length === 0 && !loading()) {
                <div class="empty-state">
                  <i class="bi bi-image"></i>
                  <p>{{ textoBusqueda() ? 'No se encontraron banners' : 'No hay banners registrados' }}</p>
                </div>
              }

              @if (loading()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Cargando banners...</p>
                </div>
              }
            </div>
          </div>
        </div>

        @if (modalOpen()) {
          <div class="modal-overlay" [class.is-closing]="modalClosing()">
            <div class="modal-panel glass-panel" [class.is-closing]="modalClosing()" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <div>
                  <h2><i class="bi bi-image-fill modal-heading-icon"></i> {{ editingId() ? 'Editar banner' : 'Nuevo banner' }}</h2>
                  <p>{{ editingId() ? 'Actualiza la información del banner seleccionado' : 'Completa la información para registrar una nueva imagen' }}</p>
                </div>
                <button class="btn-cerrar-modal" type="button" (click)="cerrarModal()">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>

              <div class="mantenedor-content modal-content">
                <div class="section-cargador">
                  <div class="card-cargador glass-panel">
                    <h2><i class="bi bi-cloud-arrow-up-fill modal-heading-icon"></i> Cargar imagen</h2>
                    <div
                      class="dropzone"
                      [class.active]="dragActive()"
                      [class.has-preview]="!!previewImage()"
                      [class.campo-valido]="campoValido('imagen')"
                      [class.campo-invalido]="campoInvalido('imagen')"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onDrop($event)"
                    >
                      @if (previewImage()) {
                        <div class="dropzone-preview">
                          <img [src]="previewImage()" alt="Vista previa del banner" class="dropzone-preview-img" />
                          <div class="dropzone-preview-overlay">
                            <span class="dropzone-preview-badge">{{ editingId() ? 'Imagen actual' : 'Imagen seleccionada' }}</span>
                            <p class="dropzone-preview-hint">Arrastra otra imagen aquí o usa el botón para reemplazarla</p>
                          </div>
                        </div>
                      } @else {
                        <div class="dropzone-content">
                          <i class="bi bi-cloud-arrow-up"></i>
                          <p class="dropzone-text">
                            Arrastra tu imagen aquí o <span class="link-upload">selecciona</span>
                          </p>
                          <p class="dropzone-hint">PNG, JPG hasta 10MB</p>
                        </div>
                      }
                      <input
                        type="file"
                        accept="image/*"
                        (change)="onFileSelected($event)"
                        style="display: none"
                        #fileInput
                      />
                    </div>
                    <button
                      class="btn-seleccionar"
                      (click)="fileInput.click()"
                      type="button"
                    >
                      <i class="bi bi-folder-plus"></i>
                      {{ previewImage() ? 'Reemplazar archivo' : 'Seleccionar archivo' }}
                    </button>
                  </div>
                </div>

                <div class="section-formulario">
                  <div class="card-formulario glass-panel">
                    <div class="form-group">
                      <label>Tipo de banner</label>
                      <div class="autocomplete-wrapper" (click)="$event.stopPropagation()">
                        <input
                          type="text"
                          class="form-input"
                          [class.campo-valido]="campoValido('tipo_banner')"
                          [class.campo-invalido]="campoInvalido('tipo_banner')"
                          [ngModel]="tipoBannerTexto()"
                          (ngModelChange)="onTipoBannerInput($event)"
                          (blur)="onTipoBannerBlur()"
                          (click)="toggleTipoBannerDropdown($event)"
                          placeholder="Selecciona un tipo de banner"
                          autocomplete="off"
                        />
                        @if (autocompleteOpen()) {
                          <div class="autocomplete-list glass-panel">
                            @if (tiposFiltrados().length > 0) {
                              @for (tipo of tiposFiltrados(); track tipo.id_tipo_banner) {
                                <button
                                  class="autocomplete-item"
                                  type="button"
                                  (click)="seleccionarTipoBanner(tipo)"
                                >
                                  <span class="tipo-nombre">{{ tipo.nombre }}</span>
                                  <span class="tipo-desc">{{ tipo.descripcion }}</span>
                                </button>
                              }
                            } @else {
                              <div class="autocomplete-empty">Sin coincidencias</div>
                            }
                          </div>
                        }
                      </div>
                    </div>

                    <div class="form-group">
                      <label>Título</label>
                      <input
                        type="text"
                        [ngModel]="formData().titulo"
                        (ngModelChange)="formData.update(s => ({ ...s, titulo: $event }))"
                        class="form-input"
                        [class.campo-valido]="campoValido('titulo')"
                        [class.campo-invalido]="campoInvalido('titulo')"
                        placeholder="Título del banner"
                        maxlength="150"
                      />
                    </div>

                    <div class="form-group">
                      <label>Descripción</label>
                      <textarea
                        [ngModel]="formData().descripcion"
                        (ngModelChange)="formData.update(s => ({ ...s, descripcion: $event }))"
                        class="form-input form-textarea"
                        [class.campo-valido]="campoValido('descripcion')"
                        [class.campo-invalido]="campoInvalido('descripcion')"
                        placeholder="Descripción breve"
                        maxlength="500"
                        rows="4"
                      ></textarea>
                    </div>

                    <div class="form-row modal-form-row">
                      <div class="form-group form-group-orden">
                        <label>
                          Orden
                          @if (rangoOrdenTexto()) {
                            <span class="label-hint">{{ rangoOrdenTexto() }}</span>
                          }
                        </label>
                        <input
                          type="number"
                          [ngModel]="formData().orden"
                          (ngModelChange)="formData.update(s => ({ ...s, orden: +$event }))"
                          class="form-input"
                          [class.campo-valido]="campoValido('orden')"
                          [class.campo-invalido]="campoInvalido('orden')"
                          min="1"
                          [attr.max]="maximoOrdenPermitido()"
                          (input)="clampOrden($event)"
                        />
                      </div>
                    </div>

                    <div class="form-actions">
                      <button
                        class="btn-guardar"
                        (click)="guardarBanner()"
                        type="button"
                      >
                        <i class="bi bi-check-circle"></i>
                        {{ editingId() ? 'Actualizar' : 'Crear' }}
                      </button>
                      <button
                        class="btn-cancelar"
                        (click)="cerrarModal()"
                        type="button"
                      >
                        <i class="bi bi-x-circle"></i>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./mantenedor-imagenes.component.css'],
})
export class MantenedorImagenesComponent implements OnInit {
  banners = signal<Banner[]>([]);
  tiposBanner = signal<TipoBanner[]>([]);
  loading = signal(false);
  readonly textoBusqueda = signal('');
  modalOpen = signal(false);
  modalClosing = signal(false);
  dragActive = signal(false);
  previewImage = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  tipoBannerTexto = signal('');
  autocompleteOpen = signal(false);
  validando = signal(false);

  readonly paginaActual = signal(1);
  private readonly PAGE_SIZE = 5;

  readonly bannersFiltrados = computed(() => {
    const criterio = this.textoBusqueda().trim().toLowerCase();
    if (!criterio) return this.banners();

    return this.banners().filter((banner) =>
      [banner.tipo_banner, banner.titulo, banner.descripcion, banner.nombre_imagen]
        .some((value) => value?.toLowerCase().includes(criterio)),
    );
  });
  readonly totalPaginas = computed(() => Math.ceil(this.bannersFiltrados().length / this.PAGE_SIZE));
  readonly bannersPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.PAGE_SIZE;
    return this.bannersFiltrados().slice(inicio, inicio + this.PAGE_SIZE);
  });
  readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

  irAPagina(pagina: number): void {
    this.paginaActual.set(pagina);
  }

  buscarBanners(texto: string): void {
    this.textoBusqueda.set(texto);
    this.paginaActual.set(1);
  }

  formData = signal({
    tipo_banner: '',
    titulo: '',
    descripcion: '',
    nombre_imagen: '',
    url_imagen: '',
    orden: 1,
  });

  editingId = signal<string | null>(null);

  readonly tiposFiltrados = computed(() => {
    const tipos = this.tiposBanner();

    if (this.autocompleteOpen()) {
      return tipos;
    }

    const texto = this.tipoBannerTexto().trim().toLowerCase();
    if (!texto) {
      return tipos;
    }

    return tipos.filter((tipo) =>
      tipo.nombre.toLowerCase().includes(texto) ||
      (tipo.descripcion ?? '').toLowerCase().includes(texto),
    );
  });

  readonly maximoOrdenPermitido = computed(() => {
    const tipoNormalizado = this.normalizarTipo(this.formData().tipo_banner || this.tipoBannerTexto());
    return tipoNormalizado === 'carrusel' ? 4 : 6;
  });

  readonly rangoOrdenTexto = computed(() => {
    const tipoSeleccionado = (this.formData().tipo_banner || this.tipoBannerTexto()).trim();
    if (!tipoSeleccionado) {
      return '';
    }
    return `(1 al ${this.maximoOrdenPermitido()})`;
  });

  constructor(private readonly bannersApiService: BannersApiService) {}

  ngOnInit(): void {
    this.cargarTiposBanner();
    this.cargarBanners();
  }

  abrirModalNuevoBanner(): void {
    this.resetFormulario();
    this.editingId.set(null);
    this.modalClosing.set(false);
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalClosing.set(true);
    window.setTimeout(() => {
      this.modalOpen.set(false);
      this.modalClosing.set(false);
      this.cancelarEdicion();
    }, 260);
  }

  cargarTiposBanner(): void {
    this.bannersApiService.obtenerTiposBanner().subscribe({
      next: (tipos) => {
        this.tiposBanner.set(tipos);
      },
      error: () => {
        this.tiposBanner.set([]);
      },
    });
  }

  onTipoBannerInput(valor: string): void {
    this.tipoBannerTexto.set(valor);
    this.formData.update((current) => ({
      ...current,
      tipo_banner: valor,
    }));
    this.autocompleteOpen.set(true);
  }

  toggleTipoBannerDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const abriendo = !this.autocompleteOpen();
    this.autocompleteOpen.set(abriendo);
    if (abriendo && this.tiposBanner().length === 0) {
      this.cargarTiposBanner();
    }
  }

  onTipoBannerBlur(): void {
    setTimeout(() => {
      this.autocompleteOpen.set(false);
    }, 120);
  }

  @HostListener('document:click')
  closeAutocomplete(): void {
    this.autocompleteOpen.set(false);
  }

  seleccionarTipoBanner(tipo: TipoBanner): void {
    if (this.tipoBannerCompleto(tipo.nombre)) {
      this.autocompleteOpen.set(false);
      this.mostrarTipoCompletoInfo(tipo.nombre);
      return;
    }

    this.tipoBannerTexto.set(tipo.nombre);
    this.formData.update((current) => ({
      ...current,
      tipo_banner: tipo.nombre,
    }));
    this.ajustarOrdenAlMaximoPermitido();
    this.autocompleteOpen.set(false);
  }

  clampOrden(event: Event): void {
    const input = event.target as HTMLInputElement;
    const maxPermitido = this.maximoOrdenPermitido();
    let val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > maxPermitido) val = maxPermitido;
    input.value = String(val);
    this.formData.update((current) => ({ ...current, orden: val }));
  }

  cargarBanners(): void {
    this.loading.set(true);
    this.bannersApiService.obtenerBanners().subscribe({
      next: (banners) => {
        this.banners.set(banners);
        this.paginaActual.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivo(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivo(input.files[0]);
    }
  }

  procesarArchivo(file: File): void {
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Formato inválido',
        text: 'Por favor selecciona una imagen válida',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }

    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage.set(e.target?.result as string);
      this.formData.update((current) => ({
        ...current,
        nombre_imagen: file.name,
        url_imagen: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  campoValido(campo: 'tipo_banner' | 'titulo' | 'descripcion' | 'imagen' | 'orden'): boolean {
    if (!this.validando()) return false;
    if (campo === 'imagen') return !!this.formData().url_imagen;
    if (campo === 'orden') return this.formData().orden >= 1 && this.formData().orden <= this.maximoOrdenPermitido();
    return !!this.formData()[campo]?.trim();
  }

  campoInvalido(campo: 'tipo_banner' | 'titulo' | 'descripcion' | 'imagen' | 'orden'): boolean {
    if (!this.validando()) return false;
    if (campo === 'imagen') return !this.formData().url_imagen;
    if (campo === 'orden') return this.formData().orden < 1 || this.formData().orden > this.maximoOrdenPermitido();
    return !this.formData()[campo]?.trim();
  }

  guardarBanner(): void {
    this.validando.set(true);

    const camposVacios: string[] = [];
    if (!this.formData().tipo_banner.trim()) camposVacios.push('Tipo de banner');
    if (!this.formData().titulo.trim()) camposVacios.push('Título');
    if (!this.formData().descripcion.trim()) camposVacios.push('Descripción');
    if (!this.formData().url_imagen) camposVacios.push('Imagen');
    if (this.formData().orden < 1 || this.formData().orden > this.maximoOrdenPermitido()) {
      camposVacios.push(`Orden (debe ser entre 1 y ${this.maximoOrdenPermitido()})`);
    }

    if (camposVacios.length > 0) {
      Swal.fire({
        icon: 'info',
        title: 'Campos incompletos',
        html: `<p>Por favor completa los siguientes campos:</p><ul style="text-align:left;margin-top:0.5rem">${camposVacios.map(c => `<li style="color:#0a3a86;font-weight:600">• ${c}</li>`).join('')}</ul>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }

    const tipoSeleccionado = this.formData().tipo_banner;
    if (this.tipoBannerCompleto(tipoSeleccionado)) {
      this.mostrarTipoCompletoInfo(tipoSeleccionado);
      return;
    }

    const ordenActual = this.formData().orden;
    const ordenDuplicado = this.banners().some(
      (b) => b.orden === ordenActual && b.id_banner !== this.editingId()
    );

    if (ordenDuplicado) {
      const maxOrden = this.maximoOrdenPermitido();
      const ordenesOcupados = this.banners()
        .filter((b) => b.id_banner !== this.editingId())
        .map((b) => b.orden);
      const disponibles = Array.from({ length: maxOrden }, (_, i) => i + 1).filter((o) => !ordenesOcupados.includes(o));
      const disponiblesTexto = disponibles.length > 0
        ? disponibles.join(', ')
        : 'ninguno disponible';

      Swal.fire({
        icon: 'info',
        title: 'Orden duplicado',
        html: `<p>Ya existe un banner con el orden <strong>${ordenActual}</strong>.</p><p style="margin-top:0.5rem">Órdenes disponibles: <strong>${disponiblesTexto}</strong></p>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0b4aa8',
      });
      return;
    }

    const bannerData = {
      tipo_banner: this.formData().tipo_banner,
      titulo: this.formData().titulo,
      descripcion: this.formData().descripcion,
      nombre_imagen: this.formData().nombre_imagen,
      url_imagen: this.formData().url_imagen,
      orden: this.formData().orden,
      usuario_registro: this.obtenerUsuarioRegistro(),
    };

    if (this.editingId()) {
      this.bannersApiService.modificarBanner(this.editingId()!, bannerData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Banner actualizado',
            confirmButtonColor: '#0b4aa8',
          });
          this.cargarBanners();
          this.cancelarEdicion();
        },
        error: (error) => {
          this.mostrarErrorGuardado(error);
        },
      });
    } else {
      this.bannersApiService.crearBanner(bannerData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Banner creado',
            confirmButtonColor: '#0b4aa8',
          });
          this.cargarBanners();
          this.cancelarEdicion();
        },
        error: (error) => {
          this.mostrarErrorGuardado(error);
        },
      });
    }
  }

  editarBanner(banner: Banner): void {
    this.modalClosing.set(false);
    this.modalOpen.set(true);
    this.editingId.set(banner.id_banner);
    this.formData.set({
      tipo_banner: banner.tipo_banner,
      titulo: banner.titulo,
      descripcion: banner.descripcion,
      nombre_imagen: banner.nombre_imagen,
      url_imagen: banner.url_imagen,
      orden: banner.orden,
    });
    this.tipoBannerTexto.set(banner.tipo_banner);
    this.previewImage.set(banner.url_imagen);
  }

  eliminarBanner(idBanner: string): void {
    Swal.fire({
      title: '¿Eliminar banner?',
      text: 'Esta acción no se puede deshacer',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (result.isConfirmed) {
        this.bannersApiService.eliminarBanner(idBanner).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Banner eliminado',
              confirmButtonColor: '#0b4aa8',
            });
            this.cargarBanners();
          },
        });
      }
    });
  }

  cancelarEdicion(): void {
    this.editingId.set(null);
    this.resetFormulario();
  }

  resetFormulario(): void {
    this.validando.set(false);
    this.tipoBannerTexto.set('');
    this.formData.set({
      tipo_banner: '',
      titulo: '',
      descripcion: '',
      nombre_imagen: '',
      url_imagen: '',
      orden: 1,
    });
    this.previewImage.set(null);
    this.selectedFile.set(null);
  }

  private obtenerUsuarioRegistro(): string {
    const usuarioSesion = localStorage.getItem('usuario_sesion');
    if (!usuarioSesion) {
      return 'SISTEMA';
    }

    try {
      const usuario = JSON.parse(usuarioSesion) as Record<string, unknown>;
      const nombres = typeof usuario['nombres'] === 'string' ? usuario['nombres'] : '';
      const apellidos = typeof usuario['apellidos'] === 'string' ? usuario['apellidos'] : '';
      const nombreCompleto = [nombres, apellidos].filter(Boolean).join(' ').trim();
      return nombreCompleto || 'SISTEMA';
    } catch {
      return 'SISTEMA';
    }
  }

  private mostrarErrorGuardado(error: { status?: number }): void {
    const esPayloadGrande = error?.status === 413;

    Swal.fire({
      icon: 'info',
      title: esPayloadGrande ? 'Imagen demasiado pesada' : 'No fue posible guardar el banner',
      text: esPayloadGrande
        ? 'La imagen seleccionada supera el tamaño permitido. Intenta con una imagen más liviana.'
        : 'Ocurrió un problema al guardar el banner. Intenta nuevamente.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0b4aa8',
    });
  }

  private tipoBannerCompleto(tipoBanner: string): boolean {
    const tipoNormalizado = this.normalizarTipo(tipoBanner);
    if (!tipoNormalizado) {
      return false;
    }

    const maximoPermitido = this.maximoPermitidoPorTipo(tipoBanner);
    const cantidadActual = this.banners().filter((banner) => {
      const mismoTipo = this.normalizarTipo(banner.tipo_banner) === tipoNormalizado;
      const noEsElMismoRegistro = banner.id_banner !== this.editingId();
      return mismoTipo && noEsElMismoRegistro;
    }).length;

    return cantidadActual >= maximoPermitido;
  }

  private maximoPermitidoPorTipo(tipoBanner: string): number {
    return this.normalizarTipo(tipoBanner) === 'carrusel' ? 4 : 6;
  }

  private normalizarTipo(tipoBanner: string): string {
    return tipoBanner
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private mostrarTipoCompletoInfo(tipoBanner: string): void {
    const esCarrusel = this.normalizarTipo(tipoBanner) === 'carrusel';
    const titulo = esCarrusel ? 'Carrusel completo' : 'Tipo de banner completo';
    const mensaje = esCarrusel
      ? 'Ya se encuentra completo las imagenes del carrusel, edita o elimina una imagen para poder seleccionarlo.'
      : `El tipo "${tipoBanner}" ya alcanzó su máximo de 6 imágenes. Edita o elimina una imagen para poder seleccionarlo.`;

    Swal.fire({
      icon: 'info',
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0b4aa8',
    });
  }

  private ajustarOrdenAlMaximoPermitido(): void {
    const maxPermitido = this.maximoOrdenPermitido();
    if (this.formData().orden > maxPermitido) {
      this.formData.update((current) => ({
        ...current,
        orden: maxPermitido,
      }));
    }
  }
}
