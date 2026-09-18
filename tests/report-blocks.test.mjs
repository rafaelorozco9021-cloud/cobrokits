import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildCreditRow,
  buildCashRow,
  buildMarginRow,
  computePeriodRows,
  buildPeriodTotals,
} from '../src/lib/report-blocks.js';

console.log('Running report-blocks.test.mjs...');

test('ENTREGA corregida: COBROS - TOTAL (sin duplicar SALDO ANT)', () => {
  // SALDO ANT 100 + COSTO CLL 50 => COBROS 150; TOTAL 60 => ENTREGA 90
  const r = buildCreditRow({ deudaInicial: 100, entregadoCreditoHoy: 50, cobradoHoy: 60 });
  assert.strictEqual(r.cobros, 150);
  assert.strictEqual(r.entrega, 90);
  // La fórmula vieja habría dado 100 + 150 - 60 = 190 (sesgo +100)
  assert.strictEqual(100 + 150 - 60, 190);
});

test('Bloque 2: caja = total - gasto y validación de cuadre', () => {
  const ok = buildCashRow({ efectivo: 60, nequi: 40, gasto: 10 });
  assert.strictEqual(ok.total, 100);
  assert.strictEqual(ok.caja, 90);
  assert.strictEqual(ok.cuadra, true);
  const bad = buildCashRow({ efectivo: 60, nequi: 40, gasto: 10, entregadoOverride: 80 });
  assert.strictEqual(bad.cuadra, false);
  assert.strictEqual(bad.diferencia, -10);
});

test('Bloque 3: margen = COSTO CLL - COSTO', () => {
  const m = buildMarginRow({ costo: 30, costoCll: 50 });
  assert.strictEqual(m.margen, 20);
});

test('Arrastre semanal: la deuda final se propaga sin inflarse', () => {
  const days = [new Date(2026, 8, 14), new Date(2026, 8, 15)];
  const visits = [
    { id: 'a', visit_date: new Date(2026, 8, 14, 12, 0), venta: 50, costo: 30, abono: 20, payment_method: 'efectivo' },
    { id: 'b', visit_date: new Date(2026, 8, 15, 12, 0), venta: 40, costo: 25, abono: 10, payment_method: 'nequi' },
  ];
  const dayKeyOf = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const { rows, deudaFinalPeriodo } = computePeriodRows({
    days,
    visits,
    payments: [],
    items: [],
    products: [],
    deudaInicialPeriodo: 100,
    deudaInicialOldPeriodo: 100,
    dayKeyOf,
  });
  // Día 1: 100 + 50 - 20 = 130 ; Día 2: 130 + 40 - 10 = 160
  assert.strictEqual(rows[0].saldoAnt, 100);
  assert.strictEqual(rows[0].cobros, 150);
  assert.strictEqual(rows[0].entrega, 130);
  assert.strictEqual(rows[1].saldoAnt, 130);
  assert.strictEqual(rows[1].entrega, 160);
  assert.strictEqual(deudaFinalPeriodo, 160);
  // Totales: entrega NO se suma
  const t = buildPeriodTotals(rows, { deudaInicialPeriodo: 100, deudaFinalPeriodo, ventaPeriodo: 90 });
  assert.strictEqual(t.entrega, 160);
  assert.strictEqual(t.cobros, 190);
});
