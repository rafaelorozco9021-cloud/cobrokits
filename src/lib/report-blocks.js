/**
 * Lógica de cálculo de Reportes (Inventario, Crédito y Recaudo).
 *
 * Separa en TRES BLOQUES INDEPENDIENTES lo que antes se mezclaba en una
 * sola cadena de fórmulas por fila/día. Cada día parte de DOS ENTRADAS
 * OBSERVADAS compartidas (misma fecha, misma fuente, sin derivarse entre sí):
 *   - recaudo del día  = { efectivo, nequi } (sumas de abonos por método)
 *   - venta del día    = { venta (= COSTO CLL), costo } (mercancía entregada hoy)
 * Ningún bloque consume la SALIDA de otro bloque:
 *   - Bloque 1 NO lee $, gasto ni margen; solo deudaInicial + venta + recaudo.
 *   - Bloque 2 NO lee saldoAnt, cobros, entrega, costo ni costoCll; solo recaudo + gasto.
 *   - Bloque 3 NO lee caja ni deuda; solo venta + costo.
 * TOTAL (= efectivo + nequi) es el MISMO dato observado leído por los
 * Bloques 1 y 2 desde la entrada compartida ("ver Bloque 2" en la spec);
 * no es un derivado que encadene cálculos entre bloques.
 *
 * BLOQUE 1 — Movimiento de crédito / deuda (en la calle):
 *   deudaInicial (SALDO ANT.) = deuda final del día/semana anterior CON movimiento
 *   + entregadoACreditoHoy    = COSTO CLL de hoy (valor de venta de lo entregado hoy)
 *   - cobradoHoy              = TOTAL de hoy (efectivo + nequi, dato observado)
 *   = deudaFinal (ENTREGA)    = único valor que se propaga como SALDO ANT. siguiente.
 *   COBROS (columna)          = deudaInicial + entregadoACreditoHoy
 *                               (ya incluye SALDO ANT; NO volver a sumarlo en ENTREGA).
 *
 *   BUG CORREGIDO: antes ENTREGA = SALDO ANT + COBROS - TOTAL, pero como
 *   COBROS = SALDO ANT + COSTO CLL, el saldo anterior se sumaba DOS veces
 *   e inflaba la deuda. La fórmula correcta es ENTREGA = COBROS - TOTAL.
 *
 * BLOQUE 2 — Caja / efectivo del día (independiente de la deuda):
 *   totalRecogido   = efectivo + nequi
 *   gasto           = opcional, default 0
 *   entregadoVendedor ($) = totalRecogido - gasto (debe cuadrar; si no, alerta).
 *
 * BLOQUE 3 — Margen (INFORMATIVO: no se mezcla con caja ni con deuda):
 *   margenPotencial (GANANCIA) = COSTO CLL - COSTO
 *   Antes era Total - Costo, sin sentido económico: TOTAL es cobro de deudas
 *   (viejas + nuevas) y COSTO es costo de lo entregado hoy (flujos distintos).
 *
 * NOTA ANTI-DUPLICACIÓN: el backend puede devolver N filas por visita cuando
 * tiene N abonos (GROUP BY incluye p.amount/payment_method; cada fila repite
 * la venta completa). Por eso venta/costo se DEDUPLICAN por visit.id; el abono
 * SÍ se suma por fila porque cada fila es un pago distinto.
 */

export function toNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// BLOQUE 2 (primero en orden de cálculo, porque el Bloque 1 lo necesita como
// dato de entrada): caja del día a partir de visits/payments.
// ---------------------------------------------------------------------------
export function sumDayCash(dayVisits = [], dayPayments = []) {
  const isEfectivo = (m) => String(m || '').toLowerCase() === 'efectivo';
  const isNequi = (m) => String(m || '').toLowerCase() === 'nequi';
  let efectivo = (dayVisits || [])
    .filter((v) => isEfectivo(v.payment_method))
    .reduce((a, v) => a + toNum(v.abono), 0);
  let nequi = (dayVisits || [])
    .filter((v) => isNequi(v.payment_method))
    .reduce((a, v) => a + toNum(v.abono), 0);
  let total = efectivo + nequi;
  // Fallback: si las visits no traen abono/método, usar la tabla payments.
  if (total === 0 && (dayPayments || []).length > 0) {
    const f = (dayPayments || [])
      .filter((p) => isEfectivo(p.payment_method))
      .reduce((a, p) => a + toNum(p.amount), 0);
    const n = (dayPayments || [])
      .filter((p) => isNequi(p.payment_method))
      .reduce((a, p) => a + toNum(p.amount), 0);
    if (f + n > 0) {
      efectivo = f;
      nequi = n;
      total = f + n;
    }
  }
  return { efectivo, nequi, total };
}

/**
 * Suma venta/costo DEDUPLICANDO por visit.id (ver NOTA ANTI-DUPLICACIÓN).
 * Solo usa datos de ventas/items: NUNCA recibe totales de caja (Regla 1).
 * Un día de solo-abonos (sin entregas) devuelve venta = 0: el cobro reduce
 * la deuda del Bloque 1 sin inventar mercancía entregada.
 */
export function sumUniqueVisitAmounts(rows = [], pick) {
  const seen = new Set();
  let acc = 0;
  for (const v of rows || []) {
    const id = v?.id ?? Symbol('sin-id');
    if (seen.has(id)) continue;
    seen.add(id);
    acc += toNum(pick(v));
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Entrada observada "venta del día" (alimenta Bloques 1 y 3).
// venta   = COSTO CLL (valor de venta de lo entregado hoy)
// costo   = costo de inversión de lo entregado hoy
// ---------------------------------------------------------------------------
export function sumDaySale(dayVisits = [], dayItems = [], products = []) {
  let venta = 0;
  let costo = 0;
  let unidades = 0;
  const costoFromVisits = sumUniqueVisitAmounts(dayVisits, (v) => v.costo);
  if ((dayItems || []).length > 0) {
    const ventaFromItems = (dayItems || []).reduce(
      (a, it) => a + toNum(it.quantity) * toNum(it.unit_price),
      0,
    );
    venta = ventaFromItems > 0
      ? ventaFromItems
      : sumUniqueVisitAmounts(dayVisits, (v) => v.venta);
    unidades = (dayItems || []).length > 0
      ? (dayItems || []).reduce((a, it) => a + Number(it.quantity || 0), 0)
      : new Set((dayVisits || []).map((v) => v.id)).size;
    if (costoFromVisits === 0) {
      const prodMap = new Map(
        (products || []).map((p) => [p.id, toNum(p.cost_price ?? p.cost)]),
      );
      costo = (dayItems || []).reduce(
        (a, it) => a + toNum(it.quantity) * toNum(prodMap.get(it.product_id)),
        0,
      );
    } else {
      costo = costoFromVisits;
    }
  } else {
    venta = sumUniqueVisitAmounts(dayVisits, (v) => v.venta);
    unidades = new Set((dayVisits || []).map((v) => v.id)).size;
    costo = costoFromVisits;
  }
  return { venta, costo, unidades };
}

// ---------------------------------------------------------------------------
// BLOQUE 1 — crédito/deuda. Recibe cobradoHoy (TOTAL observado del día) como
// dato de entrada compartido. Devuelve SALDO ANT., COBROS y ENTREGA final.
// ---------------------------------------------------------------------------
// BLOQUE 1 — crédito/deuda. Recibe cobradoHoy (TOTAL del Bloque 2) como dato.
// Devuelve las columnas SALDO ANT., COBROS y ENTREGA (deuda final).
// ---------------------------------------------------------------------------
export function buildCreditRow({ deudaInicial = 0, entregadoCreditoHoy = 0, cobradoHoy = 0 }) {
  const saldoAnt = toNum(deudaInicial);
  const costoCll = toNum(entregadoCreditoHoy);
  const total = toNum(cobradoHoy);
  // COBROS ya incluye el saldo anterior: NO volver a sumarlo en ENTREGA.
  const cobros = saldoAnt + costoCll;
  // FÓRMULA CORREGIDA: ENTREGA = COBROS - TOTAL (antes: SALDO ANT + COBROS - TOTAL).
  const entrega = cobros - total;
  return { saldoAnt, cobros, costoCll, entrega };
}

// ---------------------------------------------------------------------------
// BLOQUE 2 — cierre de caja. gasto default 0 (opcional).
// entregadoOverride: si el vendedor digita $ manualmente, se valida contra
// el esperado; si es null se usa el esperado.
// ---------------------------------------------------------------------------
export function buildCashRow({ efectivo = 0, nequi = 0, gasto = 0, entregadoOverride = null }) {
  const total = toNum(efectivo) + toNum(nequi);
  const gastoNum = toNum(gasto);
  const esperado = total - gastoNum;
  const tieneOverride = entregadoOverride !== null && entregadoOverride !== undefined && entregadoOverride !== '';
  const caja = tieneOverride ? toNum(entregadoOverride) : esperado;
  const cuadra = caja === esperado;
  return { total, gasto: gastoNum, caja, cajaEsperada: esperado, cuadra, diferencia: caja - esperado };
}

// ---------------------------------------------------------------------------
// BLOQUE 3 — margen informativo. No toca caja ni deuda.
// ---------------------------------------------------------------------------
export function buildMarginRow({ costo = 0, costoCll = 0 }) {
  const margen = toNum(costoCll) - toNum(costo);
  return { margen };
}

/**
 * Deuda neta histórica Σ(venta − cobrado) antes de una fecha, opcionalmente
 * por vendedor. Venta deduplicada por visit.id; cobrado = abonos
 * efectivo/nequi (mismo universo que TOTAL del Bloque 2, para que el
 * arrastre sea consistente con las filas del periodo).
 */
export function sumHistoryDebt(visits = [], { beforeKey = '', dayKeyOf, sellerId = null }) {
  let ventaHist = 0;
  let cobradoHist = 0;
  const seenVenta = new Set();
  for (const v of visits || []) {
    const k = dayKeyOf(v.visit_date || v.created_at);
    if (!k || k >= beforeKey) continue;
    if (sellerId !== null && sellerId !== undefined && v.seller_id !== sellerId) continue;
    const id = v?.id ?? Symbol('sin-id');
    if (!seenVenta.has(id)) {
      seenVenta.add(id);
      ventaHist += toNum(v.venta);
    }
    // Cobrado histórico: abono de la visita (efectivo/nequi). Si la visita no
    // trae método, igual cuenta como cobro si hay monto.
    const method = String(v.payment_method || '').toLowerCase();
    if (v.abono !== undefined && v.abono !== null) {
      if (method === 'efectivo' || method === 'nequi' || method === '' || v.payment_method === undefined) {
        cobradoHist += toNum(v.abono);
      }
    }
  }
  return { ventaHist, cobradoHist, deuda: ventaHist - cobradoHist };
}

// ---------------------------------------------------------------------------
// Deuda inicial CORREGIDA antes de un periodo: Σ(venta - cobrado) histórico.
// La fórmula vieja usaba Σ(venta) bruta (ignoraba cobros) y además el bug de
// ENTREGA duplicaba el saldo, por eso el saldo se inflaba semana a semana.
// ---------------------------------------------------------------------------
export function computeDeudaInicial({ visits = [], periodStartKey = '', dayKeyOf, sellerId = null }) {
  const { ventaHist, cobradoHist } = sumHistoryDebt(visits, { beforeKey: periodStartKey, dayKeyOf, sellerId });
  const deudaInicialNew = ventaHist - cobradoHist;
  const deudaInicialOld = ventaHist; // fórmula vieja: Σ ventas brutas (ENTREGA semana pasada)
  return {
    deudaInicialNew,
    deudaInicialOld,
    sesgoAcumulado: deudaInicialOld - deudaInicialNew, // = cobrado histórico ignorado
    ventaHist,
    cobradoHist,
  };
}

// ---------------------------------------------------------------------------
// Construye las filas de un periodo (semana/mes) con arrastre de deuda.
// - days: lista de Date en orden.
// - deudaInicialPeriodo: deuda final corregida acumulada antes del periodo.
// - Solo los días CON movimiento (venta > 0 o cobrado > 0) muestran SALDO ANT
//   y actualizan el arrastre; los días sin movimiento muestran 0 (se conserva
//   el layout visual actual: una fila por fecha).
// - gastosByKey / entregadoByKey: overrides editables por día (default 0/null).
// - Devuelve { rows, deudaFinalPeriodo, ventaPeriodo, cobradoPeriodo, audit }.
//   audit incluye la comparación con la fórmula vieja (ENTREGA_old =
//   SALDO ANT_old + COBROS_old - TOTAL) para el requisito de auditoría.
// ---------------------------------------------------------------------------
export function computePeriodRows({
  days = [],
  visits = [],
  payments = [],
  items = [],
  products = [],
  deudaInicialPeriodo = 0,
  deudaInicialOldPeriodo = 0,
  dayKeyOf,
  gastosByKey = {},
  entregadoByKey = {},
}) {
  let arrastre = toNum(deudaInicialPeriodo);
  let arrastreOld = toNum(deudaInicialOldPeriodo);
  let ventaPeriodo = 0;
  let cobradoPeriodo = 0;
  let costoPeriodo = 0;

  const rows = (days || []).map((d) => {
    const iso = dayKeyOf(d);
    const dayVisits = (visits || []).filter((v) => dayKeyOf(v.visit_date || v.created_at) === iso);
    const dayPayments = (payments || []).filter((p) => dayKeyOf(p.created_at || p.visit_date) === iso);

    // ENTRADAS OBSERVADAS del día (compartidas, no son salida de ningún bloque).
    const recaudo = sumDayCash(dayVisits, dayPayments); // { efectivo, nequi }
    const cobradoHoy = recaudo.efectivo + recaudo.nequi; // = TOTAL observado
    const sale = sumDaySale(dayVisits, (items || []).length > 0
      ? (items || []).filter((it) => new Set(dayVisits.map((v) => v.id)).has(it.visit_id))
      : [], products);

    const venta = sale.venta;
    const costo = sale.costo;
    const costoCll = venta; // valor de venta de lo entregado hoy
    const tieneMovimiento = venta > 0 || cobradoHoy > 0;

    // BLOQUE 1 (deuda): solo deudaInicial + venta + recaudo. Solo los días
    // con movimiento toman/actualizan el arrastre.
    const saldoAnt = tieneMovimiento ? arrastre : 0;
    const credit = buildCreditRow({ deudaInicial: saldoAnt, entregadoCreditoHoy: costoCll, cobradoHoy });

    // Auditoría fórmula vieja en este día (para mostrar el sesgo diario).
    const saldoAntOld = tieneMovimiento ? arrastreOld : 0;
    const cobrosOld = tieneMovimiento ? venta + arrastreOld : 0;
    const entregaOld = tieneMovimiento ? saldoAntOld + cobrosOld - cobradoHoy : 0;

    if (tieneMovimiento) {
      arrastre = credit.entrega;
      arrastreOld = entregaOld;
      ventaPeriodo += venta;
      cobradoPeriodo += cobradoHoy;
      costoPeriodo += costo;
    }

    // BLOQUE 2 (caja): solo recaudo + gasto. No lee valores de deuda.
    const cashRow = buildCashRow({
      efectivo: recaudo.efectivo,
      nequi: recaudo.nequi,
      gasto: gastosByKey[iso] ?? 0,
      entregadoOverride: entregadoByKey[iso] ?? null,
    });

    // BLOQUE 3 (margen): solo venta + costo. No lee caja ni deuda.
    const margin = buildMarginRow({ costo, costoCll });

    const cuentas = dayVisits.length;
    const cnl = dayVisits.filter((v) => toNum(v.deuda) === 0).length;

    return {
      date: d,
      iso,
      // Bloque 1
      saldoAnt: credit.saldoAnt,
      cobros: credit.cobros,
      entrega: credit.entrega,
      // Bloque 2
      efectivo: recaudo.efectivo,
      nequi: recaudo.nequi,
      total: cashRow.total,
      gasto: cashRow.gasto,
      caja: cashRow.caja,
      cajaEsperada: cashRow.cajaEsperada,
      cuadra: cashRow.cuadra,
      diferenciaCaja: cashRow.diferencia,
      // Bloque 3
      costo,
      costoCll,
      ganancia: margin.margen, // alias histórico de la columna GANANCIA (ahora margen)
      margen: margin.margen,
      // Auditoría
      entregaOld,
      sesgoDia: entregaOld - credit.entrega,
      tieneMovimiento,
      // extras que ya usaba la UI
      unidades: sale.unidades,
      cuentas,
      cnl,
      dMerca: venta > 0 ? Math.round((margin.margen / venta) * 100) : 0,
      dDinero: cuentas > 0 ? Math.round((cnl / cuentas) * 100) : 0,
      pctEfect: cashRow.total > 0 ? Math.round((recaudo.efectivo / cashRow.total) * 100) : 0,
    };
  });

  // Sin movimiento en todo el periodo, la deuda se mantiene intacta:
  // deudaFinal == deudaInicial (saldo arrastrado, no flujo del periodo).
  const huboMovimiento = ventaPeriodo > 0 || cobradoPeriodo > 0;
  return {
    rows,
    deudaInicialPeriodo: toNum(deudaInicialPeriodo),
    deudaFinalPeriodo: arrastre, // = único valor que se propaga al siguiente periodo
    entregaOldPeriodo: arrastreOld,
    sesgoPeriodo: arrastreOld - arrastre,
    ventaPeriodo,
    cobradoPeriodo,
    costoPeriodo,
    huboMovimiento,
  };
}

/**
 * Totales del periodo para la fila "Total".
 * La fila mezcla dos naturalezas distintas (ver títulos en la UI):
 * - FLUJOS (se suman): COSTO, COSTO CLL, EFECTIVO, NEQUI, TOTAL, GASTO, $, GANANCIA.
 * - SALDOS (no se suman, son la deuda viva): SALDO ANT. = deuda al iniciar el
 *   periodo; ENTREGA = deuda al cierre; COBROS = deuda inicial + ventas del
 *   periodo (base de cobro). La fila equivale a ver el periodo como un solo día:
 *   COBROS = SALDO ANT. + COSTO CLL y ENTREGA = COBROS − TOTAL.
 * Si el periodo no tuvo movimiento (ni ventas ni recaudos), la fila Total va
 * toda en 0: la semana no dejó nada a crédito y mostrar saldos parecería
 * actividad. La deuda arrastrada NO se pierde: sigue viva en
 * periodo.deudaFinalPeriodo y reaparece como SALDO ANT. en el próximo periodo
 * con movimiento (Regla 2).
 */
export function buildPeriodTotals(rows = [], period = {}) {
  const sum = (key) => (rows || []).reduce((a, r) => a + toNum(r[key]), 0);
  // Periodo quieto: Total en 0 (no se dejó nada a crédito esta semana).
  // El arrastre interno (period.deudaFinalPeriodo) se conserva aparte para
  // propagarlo como SALDO ANT. cuando haya movimiento de nuevo.
  if (period && period.huboMovimiento === false) {
    return {
      saldoAnt: 0, cobros: 0, costo: 0, costoCll: 0, efectivo: 0, nequi: 0,
      total: 0, entrega: 0, gasto: 0, caja: 0, ganancia: 0, margen: 0,
    };
  }
  return {
    saldoAnt: toNum(period.deudaInicialPeriodo),
    // COBROS total del periodo = deuda inicial + ventas del periodo
    // (sumar la columna COBROS diaria duplicaría la deuda arrastrada).
    cobros: toNum(period.deudaInicialPeriodo) + toNum(period.ventaPeriodo),
    costo: sum('costo'),
    costoCll: sum('costoCll'),
    efectivo: sum('efectivo'),
    nequi: sum('nequi'),
    total: sum('total'),
    entrega: toNum(period.deudaFinalPeriodo),
    gasto: sum('gasto'),
    caja: sum('caja'),
    ganancia: sum('ganancia'),
    margen: sum('ganancia'),
  };
}
