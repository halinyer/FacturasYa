/**
 * Normaliza y resuelve rutas de imágenes tanto en desarrollo local (HTTP)
 * como en producción empaquetada de Electron (protocolo file://) en cualquier PC.
 * 
 * En protocolo file://, una ruta que comience con '/' (ej. '/happydays/logo.png')
 * intenta resolver en la raíz del disco del sistema (C:\happydays\logo.png), lo que
 * falla en PCs ajenas. Al convertirla a './' se resuelve correctamente relativa
 * al index.html dentro de la aplicación empaquetada.
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

  // Si inicia con '/', transformamos a './' para no romper en file://
  if (trimmed.startsWith('/')) {
    return `.${trimmed}`;
  }

  // Si no inicia con './', lo aseguramos
  if (!trimmed.startsWith('./')) {
    return `./${trimmed}`;
  }

  return trimmed;
}

export default getAssetUrl;
