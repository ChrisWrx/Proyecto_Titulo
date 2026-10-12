import { Injectable, Logger } from '@nestjs/common';

export interface InstitutionContext {
  nombre?: string;
  tipo?: string;
  direccion?: string;
  comuna?: string;
  region?: string;
}

export interface DynamicBranding {
  nombre_marca: string;
  sitio_oficial: string | null;
  logo_recurso: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  fuente_marca: string;
  origen: 'sitio_oficial' | 'fallback';
  cacheado_hasta: string;
}

@Injectable()
export class InstitutionBrandingService {
  private readonly logger = new Logger(InstitutionBrandingService.name);
  private readonly cache = new Map<string, { expiresAt: number; branding: DynamicBranding }>();
  private readonly cacheTtlMs = 1000 * 60 * 60 * 6;

  async resolve(context: InstitutionContext): Promise<DynamicBranding> {
    const key = this.cacheKey(context);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.branding;

    const fallback = this.fallback(context);
    try {
      const site = await this.discoverSite(context);
      const branding = site ? await this.inspectSite(site, context, fallback) : fallback;
      this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, branding });
      return branding;
    } catch (error) {
      this.logger.warn(`No se pudo descubrir identidad para ${context.nombre ?? 'establecimiento'}: ${String(error)}`);
      this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, branding: fallback });
      return fallback;
    }
  }

  private async discoverSite(context: InstitutionContext): Promise<string | null> {
    const query = encodeURIComponent(`${context.nombre ?? 'centro de salud'} ${context.direccion ?? ''} ${context.comuna ?? ''}`.trim());
    const response = await fetch(`https://www.bing.com/search?q=${query}+sitio+oficial`, {
      headers: { 'User-Agent': 'Mozilla/5.0 SICHCP-branding-discovery/1.0' },
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const normalizedQuery = this.normalize(`${context.nombre ?? ''} ${context.comuna ?? ''}`);
    const candidates = [...html.matchAll(/<li class="b_algo"[\s\S]*?<h2><a href="(https?:[^" ]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(match => ({ url: match[1], title: this.normalize(match[2].replace(/<[^>]+>/g, ' ')) }))
      .filter(candidate => !/(bing|microsoft|w3\.org|cita-medica|saludresponde)/i.test(candidate.url));
    return candidates.sort((left, right) => this.siteScore(right, normalizedQuery) - this.siteScore(left, normalizedQuery))[0]?.url ?? null;
  }

  private async inspectSite(site: string, context: InstitutionContext, fallback: DynamicBranding): Promise<DynamicBranding> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(site, {
        headers: { 'User-Agent': 'SICHCP-branding-discovery/1.0' },
        signal: controller.signal,
      });
      if (!response.ok) return fallback;
      const html = await response.text();
      const origin = new URL(site).origin;
      const logo = this.extractMeta(html, 'og:image') || this.extractLink(html, 'icon');
      const colors = this.extractColors(html);
      const title = this.cleanText(this.extractMeta(html, 'og:site_name') || this.extractTitle(html) || context.nombre || 'Centro de salud');
      return {
        ...fallback,
        nombre_marca: title,
        sitio_oficial: site,
        logo_url: logo ? new URL(logo, origin).toString() : null,
        color_primario: colors[0] ?? fallback.color_primario,
        color_secundario: colors[1] ?? fallback.color_secundario,
        color_acento: colors[2] ?? fallback.color_acento,
        origen: 'sitio_oficial',
        cacheado_hasta: new Date(Date.now() + this.cacheTtlMs).toISOString(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private fallback(context: InstitutionContext): DynamicBranding {
    const comuna = this.normalize(context.comuna ?? '');
    const nombre = this.normalize(context.nombre ?? '');
    if (comuna.includes('pudahuel')) {
      return {
        nombre_marca: 'CODEP · Pudahuel',
        sitio_oficial: null,
        logo_recurso: 'logo_codep_pudahuel.png',
        logo_url: null,
        color_primario: '#AD0068',
        color_secundario: '#F5C400',
        color_acento: '#59B947',
        fuente_marca: 'Avenir Next',
        origen: 'fallback',
        cacheado_hasta: new Date(Date.now() + this.cacheTtlMs).toISOString(),
      };
    }
    if (nombre.includes('hospital el carmen')) {
      return {
        nombre_marca: 'Hospital El Carmen',
        sitio_oficial: null,
        logo_recurso: 'logo_hospital_el_carmen.png',
        logo_url: null,
        color_primario: '#0A4AA8',
        color_secundario: '#1C9AD6',
        color_acento: '#75C5E8',
        fuente_marca: 'Avenir Next',
        origen: 'fallback',
        cacheado_hasta: new Date(Date.now() + this.cacheTtlMs).toISOString(),
      };
    }
    return {
      nombre_marca: context.nombre || 'Establecimiento de salud',
      sitio_oficial: null,
      logo_recurso: null,
      logo_url: null,
      color_primario: '#2456A6',
      color_secundario: '#46B8D9',
      color_acento: '#82C7E8',
      fuente_marca: 'Avenir Next',
      origen: 'fallback',
      cacheado_hasta: new Date(Date.now() + this.cacheTtlMs).toISOString(),
    };
  }

  private extractMeta(html: string, property: string): string | null {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)`, 'i'));
    return match?.[1] ?? null;
  }

  private extractLink(html: string, relation: string): string | null {
    const match = html.match(new RegExp(`<link[^>]+rel=["'][^"']*${relation}[^"']*["'][^>]+href=["']([^"']+)`, 'i'));
    return match?.[1] ?? null;
  }

  private extractTitle(html: string): string | null {
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null;
  }

  private extractColors(html: string): string[] {
    const colors = [...html.matchAll(/#[0-9a-f]{6}\b/gi)].map(match => match[0].toUpperCase());
    return [...new Set(colors)].filter(color => !['#FFFFFF', '#FFF', '#000000'].includes(color)).slice(0, 3);
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, 150);
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private siteScore(candidate: { url: string; title: string }, normalizedQuery: string): number {
    let score = 0;
    if (candidate.title.includes('oficial')) score += 5;
    if (candidate.title.includes('salud') || candidate.title.includes('cesfam') || candidate.title.includes('hospital')) score += 4;
    for (const token of normalizedQuery.split(/\s+/).filter(item => item.length > 3)) {
      if (candidate.title.includes(token)) score += 2;
    }
    return score;
  }

  private cacheKey(context: InstitutionContext): string {
    return this.normalize(`${context.nombre}|${context.direccion}|${context.comuna}`);
  }
}
