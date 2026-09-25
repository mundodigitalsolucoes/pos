import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingOrders, splitColumns, visibleOperationalOrders } from './order-management-queue.ts';

const rows = [
  { id: 13, status: 'pending', customer_name: 'Bia', table_name: '' },
  { id: 11, status: 'pending', customer_name: 'Álvaro', table_name: '' },
  { id: 12, status: 'ready', customer_name: '', table_name: 'Mesa 4' },
  { id: 10, status: 'cancelled', customer_name: 'Antigo', table_name: '' },
  { id: 9, status: 'preparing', customer_name: 'Lia', table_name: '' },
];

test('atende um pedido pendente por vez e passa ao próximo quando o primeiro muda de status', () => {
  assert.equal(pendingOrders(rows)[0].id, 11);
  const synchronized = rows.map(o => o.id === 11 ? { ...o, status: 'preparing' } : o);
  assert.equal(pendingOrders(synchronized)[0].id, 13);
});

test('pesquisa por cliente, número e mesa nos pedidos ativos', () => {
  assert.deepEqual(visibleOperationalOrders(rows, 'ÁLVARO').map(o => o.id), [11]);
  assert.deepEqual(visibleOperationalOrders(rows, '12').map(o => o.id), [12]);
  assert.deepEqual(visibleOperationalOrders(rows, 'mesa 4').map(o => o.id), [12]);
  assert.equal(visibleOperationalOrders(rows, '').some(o => o.id === 10), false);
});

test('agrupa por etapa ou distribui os pedidos recentes sem perder linhas', () => {
  const visible = visibleOperationalOrders(rows, '');
  const [first, second] = splitColumns(visible, 'stage');
  assert.deepEqual(first.map(o => o.id), [13, 11, 9]);
  assert.deepEqual(second.map(o => o.id), [12]);
  const [left, right] = splitColumns(visible, 'recent');
  assert.deepEqual([...left, ...right].map(o => o.id).sort((a, b) => a - b), [9, 11, 12, 13]);
});
