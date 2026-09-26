import assert from 'node:assert/strict';
import { reaisToCents, kmToMeters } from '../src/app/minha-empresa/company-form-values.ts';

assert.equal(reaisToCents('8,50'), 850);
assert.equal(reaisToCents('R$ 1.234,56'), 123456);
assert.equal(reaisToCents('0,00'), 0);
assert.equal(reaisToCents('8,501'), null);
assert.equal(reaisToCents('-1'), null);
assert.equal(kmToMeters('2,5'), 2500);
assert.equal(kmToMeters('0,125'), 125);
assert.equal(kmToMeters('5'), 5000);
assert.equal(kmToMeters('2,5001'), null);
console.log('Company form conversions OK');
