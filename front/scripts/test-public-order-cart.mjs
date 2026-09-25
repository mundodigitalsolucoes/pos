import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));

await mkdir('tmp', { recursive: true });
await build({
  absWorkingDir: process.cwd(),
  entryPoints: [resolve('src/app/services/public-order-cart.service.ts')],
  outfile: resolve('tmp/public-order-cart-test.mjs'),
  platform: 'node', format: 'esm', bundle: true, packages: 'external',
});

try {
  const { PublicOrderCartService } = await import('../tmp/public-order-cart-test.mjs');
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const group = {
    id: 10, name: 'Extras', min_select: 1, max_select: 1, is_required: true,
    options: [
      { id: 11, name: 'Bacon', price_delta_cents: 250 },
      { id: 12, name: 'Queijo', price_delta_cents: 150 },
    ],
  };
  const product = { id: 1, name: 'Hambúrguer', price_cents: 1000, available: true, modifier_groups: [group] };
  const simple = { id: 2, name: 'Água', price_cents: 400, available: true };
  const menu = (tenant, products) => ({ tenant_id: tenant, categories: [{ products }] });

  const cart = new PublicOrderCartService();
  cart.useTenant(1);
  cart.add(product);
  assert.equal(cart.count(), 0, 'required option cannot be bypassed');
  cart.addCustomized(product, [11], [group]);
  cart.addCustomized(product, [12], [group]);
  cart.add(simple);
  assert.equal(cart.subtotalCents(), 2800);
  cart.setQuantity('1:11', 2);
  assert.equal(cart.subtotalCents(), 4050);
  assert.equal(cart.lines().find((line) => line.key === '1:12').quantity, 1);
  cart.remove('1:11');
  assert.equal(cart.lines().length, 2);
  assert.equal(JSON.parse(storage.get('mds-food-public-cart:1'))[0].product, undefined, 'prices are not persisted');

  const restored = new PublicOrderCartService();
  restored.useTenant(1);
  restored.reconcile(1, menu(1, [{ ...product, price_cents: 1200 }, simple]));
  assert.equal(restored.subtotalCents(), 1750, 'live prices replace stored values');
  assert.deepEqual(restored.lines().find((line) => line.key === '1:12').selectedOptionIds, [12]);
  restored.useTenant(2);
  restored.reconcile(2, menu(2, [simple]));
  assert.equal(restored.count(), 0, 'tenants are isolated');
  restored.useTenant(1);
  restored.reconcile(1, menu(1, [product, simple]));
  assert.equal(restored.count(), 2);
  restored.clear();
  assert.equal(storage.has('mds-food-public-cart:1'), false);

  storage.set('mds-food-public-cart:3', '{broken');
  restored.useTenant(3);
  restored.reconcile(3, menu(3, [simple]));
  assert.equal(restored.count(), 0);
  assert.equal(storage.has('mds-food-public-cart:3'), false);

  storage.set('mds-food-public-cart:4', JSON.stringify([{ productId: 1, quantity: 2, selectedOptionIds: [99] }]));
  restored.useTenant(4);
  restored.reconcile(4, menu(4, [product]));
  assert.equal(restored.count(), 0, 'inactive or foreign modifiers are discarded');
  storage.set('mds-food-public-cart:5', JSON.stringify([{ productId: 2, quantity: 1, selectedOptionIds: [] }]));
  restored.useTenant(5);
  restored.reconcile(5, menu(5, [{ ...simple, available: false }]));
  assert.equal(restored.count(), 0, 'unavailable products are discarded');
  console.log('Public order cart: all assertions passed');
} finally {
  await rm('tmp/public-order-cart-test.mjs', { force: true });
}
