import { test } from 'node:test';
import assert from 'node:assert';
import { formatMoney } from '../src/lib/format.js';

console.log('Running format.test.mjs...');

test('formatMoney should format 1234567 as $1.234.567,00', () => {
  const result = formatMoney(1234567);
  assert.strictEqual(result, '$1.234.567,00');
});

test('formatMoney should format 1000 as $1.000,00', () => {
  const result = formatMoney(1000);
  assert.strictEqual(result, '$1.000,00');
});

test('formatMoney should format 0 as $0,00', () => {
  const result = formatMoney(0);
  assert.strictEqual(result, '$0,00');
});

test('formatMoney should format large numbers correctly', () => {
  const result = formatMoney(999999999999.99);
  assert.ok(result.startsWith('$999.999.999.999,99'), `Expected formatted large number, got: ${result}`);
});

test('formatMoney should handle NaN', () => {
  const result = formatMoney(NaN);
  assert.strictEqual(result, '$0,00');
});

test('formatMoney should handle negative numbers', () => {
  const result = formatMoney(-1000);
  assert.ok(result.startsWith('-$'), `Expected negative format, got: ${result}`);
});