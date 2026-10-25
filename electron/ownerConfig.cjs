/**
 * Configuración de acceso del DUEÑO al Monitor móvil (/monitor).
 * El PIN vive solo en código: no se muestra ni se edita desde ninguna pantalla del POS.
 * Para cambiarlo, edita este archivo y vuelve a compilar la app.
 */
module.exports = {
  OWNER_PIN: '1966',
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MS: 5 * 60 * 1000
};
