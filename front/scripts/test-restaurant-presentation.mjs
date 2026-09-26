import assert from 'node:assert/strict';
import { descriptionLines } from '../src/app/shared/restaurant-description.ts';
import { restaurantOpenStatus } from '../src/app/shared/restaurant-open-status.ts';

assert.deepEqual(descriptionLines('Descrição antiga'), [{ list: false, runs: [{ text: 'Descrição antiga', emphasis: 'plain' }] }]);
assert.deepEqual(descriptionLines('**Pizza** _artesanal_\n- Entrega'), [
  { list: false, runs: [{ text: 'Pizza', emphasis: 'bold' }, { text: ' ', emphasis: 'plain' }, { text: 'artesanal', emphasis: 'italic' }] },
  { list: true, runs: [{ text: 'Entrega', emphasis: 'plain' }] },
]);
const malicious = '<img src=x onerror=alert(1)><script>alert(2)</script>';
assert.deepEqual(descriptionLines(malicious)[0].runs, [{ text: malicious, emphasis: 'plain' }]);
assert.deepEqual(descriptionLines(''), []);

const hours = JSON.stringify({ saturday: { closed: false, open: '10:00', close: '23:00' }, sunday: { closed: true } });
assert.equal(restaurantOpenStatus(hours, 'America/Sao_Paulo', new Date('2026-09-26T15:00:00Z')), 'open');
assert.equal(restaurantOpenStatus(hours, 'America/Sao_Paulo', new Date('2026-09-27T15:00:00Z')), 'closed');
assert.equal(restaurantOpenStatus('invalid JSON', 'America/Sao_Paulo'), null);
assert.equal(restaurantOpenStatus(null, 'America/Sao_Paulo'), null);
console.log('Descrição e status do restaurante: testes aprovados.');
