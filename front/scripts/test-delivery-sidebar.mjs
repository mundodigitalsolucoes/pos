import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync(new URL('../src/app/shared/sidebar.component.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../src/app/app.routes.ts', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/delivery-zones/delivery-zones.component.ts', import.meta.url), 'utf8');

const menu = sidebar.slice(sidebar.indexOf('<nav class="nav"'), sidebar.indexOf('</nav>'));

test('Delivery appears between Catálogo and Integrações with the existing active-link behavior', () => {
  const catalog = menu.indexOf('routerLink="/products"');
  const delivery = menu.indexOf('routerLink="/areas-de-entrega"');
  const integrations = menu.indexOf('routerLink="/integracoes"');
  assert.ok(catalog >= 0 && catalog < delivery && delivery < integrations);
  assert.match(menu.slice(delivery, integrations), /routerLinkActive="active" class="nav-link" \(click\)="closeSidebar\(\)"/);
  assert.match(sidebar, /if \(path === '\/areas-de-entrega'\) return 'Áreas de entrega'/);
});

test('Delivery has the same admin visibility as Minha empresa', () => {
  assert.match(menu, /@if \(canViewSettings\(\)\) \{\s*<a routerLink="\/areas-de-entrega"/);
  assert.match(menu, /@if \(canViewSettings\(\)\) \{\s*<a routerLink="\/minha-empresa"/);
  assert.match(sidebar, /canViewSettings = computed\(\(\) => this.permissions.isAdmin\(this.user\(\)\)\)/);
});

test('existing protected lazy route initializes the screen and fetches tenant zones', () => {
  assert.match(routes, /path: 'areas-de-entrega', canActivate: \[authGuard, adminGuard\], loadComponent: \(\) => import\('\.\/delivery-zones\/delivery-zones.component'\)/);
  assert.match(component, /ngOnInit\(\): void \{ this.reload\(\); \}/);
  assert.match(component, /this.api.listDeliveryZones\(\)/);
});
