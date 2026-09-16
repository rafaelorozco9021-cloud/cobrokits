/**
 * Fechas calendario en America/Bogota.
 * Las visitas se guardan como timestamptz (UTC). Para que todos los reportes
 * (semanal, mensual, diaria) ubiquen una venta en el MISMO día, siempre se
 * convierte a fecha calendario de Bogotá, nunca con toISOString (UTC) ni
 * slice(0,10) del string crudo (ambos mueven ventas nocturnas 19:00-23:59
 * al día siguiente).
 */

export function bogotaDayKey(input) {
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    // en-CA => YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    try {
      return String(input || '').slice(0, 10);
    } catch {
      return '';
    }
  }
}

export function todayBogotaKey() {
  return bogotaDayKey(new Date());
}
