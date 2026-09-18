import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannersApiService, Banner } from '../../../core/services/banners-api.service';

@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.css'],
})
export class CarruselComponent implements OnInit, OnDestroy {
  readonly slides     = signal<Banner[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal('');
  readonly currentIdx = signal(0);
  readonly animating  = signal(false);
  readonly direction  = signal<'next' | 'prev'>('next');

  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  private readonly carruselCacheKey = 'dashboard_carrusel_cache_v1';
  private readonly carruselCacheTtlMs = 10 * 60 * 1000;

  readonly total = computed(() => this.slides().length);

  constructor(private readonly bannersApi: BannersApiService) {}

  ngOnInit(): void {
    const cachedSlides = this.readCarruselCache();
    if (cachedSlides.length > 0) {
      this.slides.set(cachedSlides);
      this.loading.set(false);
      if (cachedSlides.length > 1) {
        this.startAutoPlay();
      }
    }

    this.bannersApi.obtenerCarrusel().subscribe({
      next: (data) => {
        this.slides.set(data);
        this.loading.set(false);
        this.writeCarruselCache(data);
        if (data.length > 1) {
          this.startAutoPlay();
        }
      },
      error: () => {
        if (!cachedSlides.length) {
          this.error.set('No se pudieron cargar las imágenes del carrusel.');
        }
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private touchStartX = 0;

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].clientX;
    this.pauseAutoPlay();
  }

  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 40) {
      dx < 0 ? this.next() : this.prev();
    }
    this.resumeAutoPlay();
  }

  goTo(idx: number): void {
    if (this.animating() || idx === this.currentIdx()) return;
    this.direction.set(idx > this.currentIdx() ? 'next' : 'prev');
    this.triggerTransition(idx);
  }

  next(): void {
    if (this.animating()) return;
    this.direction.set('next');
    this.triggerTransition((this.currentIdx() + 1) % this.total());
  }

  prev(): void {
    if (this.animating()) return;
    this.direction.set('prev');
    this.triggerTransition((this.currentIdx() - 1 + this.total()) % this.total());
  }

  pauseAutoPlay(): void {
    this.stopAutoPlay();
  }

  resumeAutoPlay(): void {
    if (this.total() > 1) {
      this.startAutoPlay();
    }
  }

  private triggerTransition(nextIdx: number): void {
    this.animating.set(true);
    this.currentIdx.set(nextIdx);
    setTimeout(() => this.animating.set(false), 600);
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => {
      this.direction.set('next');
      this.triggerTransition((this.currentIdx() + 1) % this.total());
    }, 5000);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer !== null) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  private readCarruselCache(): Banner[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.carruselCacheKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as { ts?: number; data?: Banner[] };
      if (!parsed.ts || !Array.isArray(parsed.data)) {
        return [];
      }

      if (Date.now() - parsed.ts > this.carruselCacheTtlMs) {
        return [];
      }

      return parsed.data;
    } catch {
      return [];
    }
  }

  private writeCarruselCache(slides: Banner[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(
        this.carruselCacheKey,
        JSON.stringify({ ts: Date.now(), data: slides }),
      );
    } catch {
      // Ignore quota/storage errors to keep UX responsive.
    }
  }
}
