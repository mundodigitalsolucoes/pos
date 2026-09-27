import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual form and currency conversion functions without a browser.
const extract = (filename, names) => {
  const source = readFileSync(new URL(filename, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  return ast.statements.filter(statement => ts.isFunctionDeclaration(statement) &&
    names.includes(statement.name?.text)).map(statement => statement.getText(ast).replace(/^export\s+/, '')).join('\n');
};
const source = [
  extract('../src/app/minha-empresa/company-form-values.ts', ['kmToMeters', 'reaisToCents']),
  extract('../src/app/delivery-zones/delivery-zones.component.ts', ['formToZone']),
  'globalThis.convert = formToZone;',
].join('\n');
const context = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const convert = context.convert;

test('15–20 km and 25–30 km are accepted without a distance cap', () => {
  const form = { maxKm: '20', fee: '12,90', minutes: '40' };
  const first = convert(form, 15000, 4);
  assert.equal(first.min_distance_meters, 15000);
  assert.equal(first.max_distance_meters, 20000);
  assert.equal(first.fee_cents, 1290);
  assert.equal(first.estimated_minutes, 40);
  assert.equal(first.name, '15–20 km');
  assert.equal(convert({ ...form, maxKm: '30' }, 25000, 5).max_distance_meters, 30000);
});

test('rejects an overlapping or inverted range and invalid fee or time', () => {
  const form = { maxKm: '15', fee: '5,00', minutes: '30' };
  assert.equal(convert(form, 15000, 2), null);
  assert.equal(convert({ ...form, maxKm: '14' }, 15000, 2), null);
  assert.equal(convert({ ...form, fee: '1,999' }, 0, 1), null);
  assert.equal(convert({ ...form, minutes: '0' }, 0, 1), null);
});
