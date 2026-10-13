// Exportación centralizada del cliente/franquicia activa
// Todo nuevo restaurante o cambio de colores se gestiona en src/config/franchises/
import ACTIVE_FRANCHISE, { FRANCHISES, getActiveFranchise, applyFranchiseTheme } from './franchises/index.js';

export const CLIENT_CONFIG = ACTIVE_FRANCHISE;
export { FRANCHISES, getActiveFranchise, applyFranchiseTheme };
export default CLIENT_CONFIG;
