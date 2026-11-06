/**
 * Utilidades de formateo de monedas con protección anti-desbordamiento
 * para la economía bimonetaria venezolana (USD / VES).
 */

/**
 * Formatea un número como Dólares ($)
 * @param {number|string} amount
 * @returns {string} Ej: "$25.00"
 */
export function formatUSD(amount) {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Formatea un número como Bolívares (Bs.) con estándar venezolano
 * (Punto para miles, coma para decimales)
 * @param {number|string} amount
 * @returns {string} Ej: "Bs. 1.250,50"
 */
export function formatBs(amount) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `Bs. ${formatted}`;
}

/**
 * Calcula un tamaño de fuente dinámico en CSS según la longitud de caracteres de Bolívares
 * para garantizar que cifras millonarias o de muchos dígitos jamás rompan la tarjeta o el contenedor.
 * @param {number|string} amount
 * @returns {string} CSS font-size (ej: "1.2rem", "0.95rem", "0.82rem")
 */
export function getBsFontSize(amount) {
  const str = typeof amount === 'string' ? amount : formatBs(amount);
  const len = str.length;
  if (len > 22) return '0.78rem';
  if (len > 18) return '0.86rem';
  if (len > 14) return '0.96rem';
  if (len > 11) return '1.08rem';
  return '1.18rem';
}

/**
 * Formatea la tasa oficial del BCV con precisión oficial de 4 decimales
 * @param {number|string} rate
 * @returns {string} Ej: "876.7976"
 */
export function formatRate(rate) {
  const num = Number(rate) || 0;
  return num.toFixed(4);
}

