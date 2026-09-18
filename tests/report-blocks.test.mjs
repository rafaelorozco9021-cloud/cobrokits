import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildCreditRow,
  buildCashRow,
  buildMarginRow,
  computePeriodRows,
  buildPeriodTotals,
  computeDeudaInicial,
  sumDaySale,
  sumHistoryDebt,
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

test('Regla 1: dia de solo-abonos NO inventa venta (COSTO CLL=0, la deuda baja)', () => {
  // Sin visits de venta, solo un pago suelto de 70 en payments.
  const days = [new Date(2026, 8, 16)];
  const dayKeyOf = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const { rows } = computePeriodRows({
    days,
    visits: [],
    payments: [{ created_at: new Date(2026, 8, 16, 12, 0), amount: 70, payment_method: 'efectivo' }],
    items: [],
    products: [],
    deudaInicialPeriodo: 200,
    deudaInicialOldPeriodo: 200,
    dayKeyOf,
  });
  assert.strictEqual(rows[0].costoCll, 0);
  assert.strictEqual(rows[0].cobros, 200); // solo arrastre, sin inflar
  assert.strictEqual(rows[0].entrega, 130); // 200 - 70
  assert.strictEqual(rows[0].ganancia, 0); // sin entregas no hay margen
});

test('Anti-duplicacion: visita con 2 abonos (2 filas backend) cuenta la venta una vez', () => {
  const dayKeyOf = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const visits = [
    { id: 'v1', visit_date: new Date(2026, 8, 17, 12, 0), venta: 100, costo: 60, abono: 30, payment_method: 'efectivo' },
    { id: 'v1', visit_date: new Date(2026, 8, 17, 12, 0), venta: 100, costo: 60, abono: 20, payment_method: 'efectivo' },
  ];
  const sale = sumDaySale(visits, [], []);
  assert.strictEqual(sale.venta, 100); // no 200
  assert.strictEqual(sale.costo, 60); // no 120
  const hist = sumHistoryDebt(visits, { beforeKey: '2026-09-18', dayKeyOf });
  assert.strictEqual(hist.ventaHist, 100);
  assert.strictEqual(hist.cobradoHist, 50); // cada fila es un pago distinto: 30+20
  assert.strictEqual(hist.deuda, 50);
});

test('Regla 1: GASTO no afecta la deuda y el cobro no afecta la caja esperada', () => {
  const days = [new Date(2026, 8, 18)];
  const dayKeyOf = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const visits = [
    { id: 'w', visit_date: new Date(2026, 8, 18, 12, 0), venta: 100, costo: 60, abono: 40, payment_method: 'efectivo' },
  ];
  const base = { days, visits, payments: [], items: [], products: [], deudaInicialPeriodo: 0, deudaInicialOldPeriodo: 0, dayKeyOf };
  const sinGasto = computePeriodRows({ ...base, gastosByKey: {} }).rows[0];
  const conGasto = computePeriodRows({ ...base, gastosByKey: { [sinGasto.iso]: 15 } }).rows[0];
  assert.strictEqual(conGasto.entrega, sinGasto.entrega); // Bloque 2 no toca Bloque 1
  assert.strictEqual(conGasto.cobros, sinGasto.cobros);
  assert.strictEqual(conGasto.cajaEsperada, sinGasto.cajaEsperada - 15); // gasto solo mueve $
  assert.strictEqual(conGasto.ganancia, sinGasto.ganancia); // margen intacto
});

test('Auditoria: el sesgo acumulado equals cobrado historico ignorado por la formula vieja', () => {
  const dayKeyOf = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const visits = [
    { id: 'h1', visit_date: new Date(2026, 8, 1, 12, 0), venta: 500, costo: 300, abono: 200, payment_method: 'efectivo' },
    { id: 'h2', visit_date: new Date(2026, 8, 2, 12, 0), venta: 300, costo: 180, abono: 100, payment_method: 'nequi' },
  ];
  const r = computeDeudaInicial({ visits, periodStartKey: '2026-09-10', dayKeyOf });
  assert.strictEqual(r.deudaInicialNew, 500); // (500+300)-(200+100)
  assert.strictEqual(r.deudaInicialOld, 800); // formula vieja: ventas brutas
  assert.strictEqual(r.sesgoAcumulado, 300); // cobrado ignorado
});
