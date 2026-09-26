#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'src/app/landing/landing.component.html'), 'utf8');
const component = readFileSync(resolve(root, 'src/app/landing/landing.component.ts'), 'utf8');
const css = readFileSync(resolve(root, 'src/app/landing/landing.component.scss'), 'utf8');

for (const id of ['recursos', 'como-funciona', 'integracoes', 'planos', 'duvidas', 'cardapio']) {
  assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, new RegExp(`href="#${id}"`));
}
assert.match(html, /Soluções para seu restaurante/);
assert.match(html, /77,90/);
assert.match(html, /99,00/);
assert.match(html, /7 dias grátis/);
assert.match(html, /Prévia ilustrativa/);
assert.match(html, /EM DESENVOLVIMENTO/);
assert.match(html, /PLANEJADO/);
assert.match(html, /routerLink="\/register"/);
assert.match(html, /routerLink="\/login"/);
assert.match(html, /aria-controls="site-links"/);
assert.match(html, /<details>/);
assert.match(component, /lookupPublicTable\(code\)/);
assert.match(css, /max-width:800px/);
assert.match(css, /max-width:550px/);
console.log('Commercial landing: anchors, CTAs, pricing, roadmap, mobile and guest access OK');
