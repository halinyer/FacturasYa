/**
 * Normaliza y resuelve rutas de imágenes tanto en desarrollo web (HTTP/HTTPS)
 * como en producción empaquetada de Electron (protocolo file://).
 * 
 * - En protocolo file:// (Electron Desktop): Requiere prefijo relativo './'
 *   para resolver relativo a dist/index.html dentro de la app empaquetada.
 * - En protocolo http/https (Web pública / Vercel): Requiere '/' absoluto desde la raíz
 *   del dominio para no romperse cuando la URL del navegador está en subrutas (/login, /pos, etc.).
 */
export function getAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  const clean = trimmed.replace(/^(\.\/|\/)+/, '');

  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `./${clean}`;
  }

  return `/${clean}`;
}

export default getAssetUrl;
