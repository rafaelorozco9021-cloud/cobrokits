export function formatMoney(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '$0,00';
  const rounded = Math.round(num * 100) / 100;
  const formatted = rounded.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const isNegative = num < 0;
  let result = `$${formatted}`;
  if (isNegative) {
    result = `-${result}`;
  }
  return result;
}

export function formatNumber(num) {
  return Number(num).toLocaleString('es-CO');
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-CO');
}
