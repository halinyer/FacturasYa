/**
 * Utilidades de fecha y hora para Venezuela (Zona Horaria America/Caracas, UTC-4).
 * Previene el "Bug de Medianoche" donde ventas nocturnas (después de las 8:00 PM)
 * se desfasaban al día siguiente al usar UTC .toISOString() o .split('T')[0].
 */

/**
 * Devuelve la fecha local de Venezuela en formato "YYYY-MM-DD".
 * Ejemplo: Si son las 21:30 en Caracas del 27 de Octubre (01:30 UTC del 28),
 * esta función devuelve garantizado "2026-10-27".
 */
export function getVenezuelaDateString(dateVal = null) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d); // Formato "YYYY-MM-DD"
  } catch (e) {
    // Fallback: restar 4 horas manualmente (240 minutos)
    const local = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return local.toISOString().split('T')[0];
  }
}

/**
 * Devuelve la fecha local de Venezuela en formato estándar contable "DD/MM/YYYY".
 */
export function formatVenezuelaDate(dateVal = null) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return formatter.format(d); // "DD/MM/YYYY"
  } catch (e) {
    const dateStr = getVenezuelaDateString(d);
    const [y, m, day] = dateStr.split('-');
    return `${day}/${m}/${y}`;
  }
}

/**
 * Devuelve el año, mes ("01"-"12") y día numérico en hora de Venezuela.
 */
export function getVenezuelaYearMonth(dateVal = null) {
  const dateStr = getVenezuelaDateString(dateVal);
  if (!dateStr || !dateStr.includes('-')) {
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: now.getDate()
    };
  }
  const [year, month, dayStr] = dateStr.split('-');
  return {
    year,
    month,
    day: parseInt(dayStr, 10)
  };
}

/**
 * Devuelve una cadena ISO con offset explícito de Venezuela (-04:00).
 * Ejemplo: "2026-10-27T21:30:15-04:00"
 */
export function getVenezuelaISOString(dateVal = null) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type) => parts.find(p => p.type === type)?.value || '00';
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}-04:00`;
  } catch (e) {
    return d.toISOString();
  }
}
