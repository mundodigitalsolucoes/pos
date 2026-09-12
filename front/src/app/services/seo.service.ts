import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

export interface SeoPageConfig {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

const BRAND = 'MDS Food';
const BRAND_TITLE = 'MDS Food - Soluções para seu restaurante.';
const DEFAULT_DESCRIPTION =
  'MDS Food é uma plataforma para restaurantes com cardápio digital, pedidos, reservas, mesas, cozinha, estoque, relatórios e gestão em um só lugar.';
const OG_IMAGE_PATH = '/og-image.png';

const MARKETING_PAGES: Record<string, Omit<SeoPageConfig, 'path'>> = {
  '/': { title: BRAND_TITLE, description: DEFAULT_DESCRIPTION },
  '/features': { title: `Recursos - ${BRAND}`, description: 'Conheça os recursos da MDS Food para cardápio digital, pedidos, reservas, cozinha, estoque e gestão.' },
  '/about': { title: `Sobre - ${BRAND}`, description: 'Conheça a MDS Food, plataforma da Mundo Digital Soluções para restaurantes.' },
  '/register': { title: `Crie seu restaurante - ${BRAND}`, description: 'Crie sua conta MDS Food e configure seu restaurante.' },
  '/signup': { title: `Crie seu restaurante - ${BRAND}`, description: 'Crie sua conta MDS Food e configure seu restaurante.' },
  '/orders': { title: `Pedidos online - ${BRAND}`, description: 'Faça pedidos online em restaurantes que usam MDS Food.' },
  '/terms': { title: `Termos de uso - ${BRAND}`, description: 'Termos de uso da plataforma MDS Food.' },
  '/privacy': { title: `Política de privacidade - ${BRAND}`, description: 'Política de privacidade da plataforma MDS Food.' },
};

const NOINDEX_PREFIXES = [
  '/login','/forgot-password','/reset-password','/paywall','/dashboard','/my-shift','/talk','/products','/catalog','/tables','/staff/','/customers','/kitchen','/bar','/settings','/users','/contracts','/inventory','/reports','/working-plan','/reservations','/guest-feedback','/provider','/courier','/platform',
];

const DYNAMIC_PUBLIC_PREFIXES = ['/book/','/public-menu/','/delivery/','/waitlist/','/feedback/','/menu/','/reservation'];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private sub?: Subscription;

  start(): void {
    this.applyForUrl(this.router.url);
    this.sub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => this.applyForUrl(e.urlAfterRedirects));
  }

  stop(): void { this.sub?.unsubscribe(); this.sub = undefined; }

  applyFeatureDetail(path: string, title: string, description: string): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mdsfood.testesite.tech';
    this.applyTags({ title, description, path }, origin);
  }

  applyForUrl(rawUrl: string): void {
    const path = this.normalizePath(rawUrl);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mdsfood.testesite.tech';
    if (this.isNoindexPath(path)) {
      this.applyTags({ title: BRAND_TITLE, description: DEFAULT_DESCRIPTION, path, noindex: true }, origin);
      return;
    }
    const marketing = MARKETING_PAGES[path];
    if (marketing) { this.applyTags({ ...marketing, path }, origin); return; }
    if (path.startsWith('/features/') && path.length > '/features/'.length) {
      this.meta.updateTag({ name: 'robots', content: 'index,follow' }); this.setCanonical(origin, path); this.meta.updateTag({ property: 'og:url', content: this.absoluteUrl(origin, path) }); return;
    }
    if (this.isDynamicPublicPath(path)) {
      this.meta.updateTag({ name: 'robots', content: 'index,follow' }); this.setCanonical(origin, path); this.meta.updateTag({ property: 'og:url', content: this.absoluteUrl(origin, path) }); return;
    }
    this.applyTags({ title: BRAND_TITLE, description: DEFAULT_DESCRIPTION, path }, origin);
  }

  private applyTags(cfg: SeoPageConfig, origin: string): void {
    const url = this.absoluteUrl(origin, cfg.path);
    this.title.setTitle(cfg.title);
    this.meta.updateTag({ name: 'description', content: cfg.description });
    this.meta.updateTag({ name: 'robots', content: cfg.noindex ? 'noindex,nofollow' : 'index,follow' });
    this.setCanonical(origin, cfg.path);
    this.setOgBasics({ title: cfg.title, description: cfg.description, url });
  }

  private setOgBasics(opts: { title: string; description: string; url: string }): void {
    const image = this.absoluteUrl(typeof window !== 'undefined' ? window.location.origin : 'https://mdsfood.testesite.tech', OG_IMAGE_PATH);
    this.meta.updateTag({ property: 'og:type', content: 'website' }); this.meta.updateTag({ property: 'og:site_name', content: BRAND }); this.meta.updateTag({ property: 'og:title', content: opts.title }); this.meta.updateTag({ property: 'og:description', content: opts.description }); this.meta.updateTag({ property: 'og:url', content: opts.url }); this.meta.updateTag({ property: 'og:image', content: image }); this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' }); this.meta.updateTag({ name: 'twitter:title', content: opts.title }); this.meta.updateTag({ name: 'twitter:description', content: opts.description }); this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private setCanonical(origin: string, path: string): void {
    const href = this.absoluteUrl(origin, path === '/' ? '/' : path);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
    link.setAttribute('href', href);
  }

  private absoluteUrl(origin: string, path: string): string { return !path || path === '/' ? `${origin}/` : `${origin}${path.startsWith('/') ? path : `/${path}`}`; }
  private normalizePath(rawUrl: string): string { const withoutQuery = rawUrl.split('?')[0].split('#')[0]; if (!withoutQuery || withoutQuery === '/') return '/'; return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery; }
  private isNoindexPath(path: string): boolean { return NOINDEX_PREFIXES.some((prefix) => prefix.endsWith('/') ? path === prefix.slice(0, -1) || path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`)); }
  private isDynamicPublicPath(path: string): boolean { return DYNAMIC_PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix)); }
}
