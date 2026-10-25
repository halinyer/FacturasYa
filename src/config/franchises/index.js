import facturapos from './facturapos.js';
import happydays from './happydays.js';
import heladoscali from './heladoscali.js';
import heladoslacascada from './heladoslacascada.js';

/**
 * Registro de franquicias y restaurantes soportados.
 * Para agregar un nuevo restaurante, simplemente crea un archivo en esta carpeta
 * y agrégalo a este objeto con su respectivo identificador.
 */
export const FRANCHISES = {
  facturapos,
  happydays,
  heladoscali,
  heladoslacascada
};

/**
 * Obtiene la configuración del restaurante o franquicia actualmente activa.
 * En la rama cliente/helados-la-cascada, el valor por defecto es Helados La Cascada.
 */
export function getActiveFranchise() {
  const savedId = typeof window !== 'undefined' ? localStorage.getItem('pos_active_franchise') : null;
  if (savedId && FRANCHISES[savedId] && savedId !== 'facturapos') {
    return FRANCHISES[savedId];
  }
  return FRANCHISES.heladoslacascada;
}

/**
 * Aplica los tokens y colores de la franquicia seleccionada como variables CSS
 * directamente en :root del documento HTML.
 */
export function applyFranchiseTheme(franchise) {
  if (typeof document === 'undefined') return;
  const colors = franchise?.branding?.colors || {};
  const root = document.documentElement;

  if (colors.primary) root.style.setProperty('--brand-primary', colors.primary);
  if (colors.primaryHover) root.style.setProperty('--brand-primary-hover', colors.primaryHover);
  if (colors.dark) root.style.setProperty('--brand-dark', colors.dark);
  if (colors.warm) root.style.setProperty('--brand-warm', colors.warm);
  if (colors.peach) root.style.setProperty('--brand-peach', colors.peach);
  if (colors.green) root.style.setProperty('--brand-green', colors.green);
  if (colors.accentSoft) root.style.setProperty('--brand-accent-soft', colors.accentSoft);
  if (colors.borderSubtle) root.style.setProperty('--brand-border-subtle', colors.borderSubtle);
}

// Configuración activa por defecto
export const ACTIVE_FRANCHISE = getActiveFranchise();

// Aplicación inmediata del tema visual
applyFranchiseTheme(ACTIVE_FRANCHISE);

export default ACTIVE_FRANCHISE;
