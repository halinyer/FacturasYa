// Utilidad para comprimir imágenes en el navegador y guardarlas offline (Base64).
// Redimensiona a un máximo de `maxSize` px por lado y exporta en JPEG para que
// cada foto ocupe poco espacio en el almacenamiento local (~15-40 KB).

export const MAX_UPLOAD_MB = 10;

export function compressImage(file, maxSize = 400, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen.'));
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      reject(new Error(`La imagen supera los ${MAX_UPLOAD_MB} MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.onload = () => {
        // Generar un lienzo cuadrado estándar 1:1 (maxSize x maxSize)
        // para que todas las fotos queden perfectamente fijas, simétricas y responsive
        const size = maxSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fondo blanco limpio para transparencia y bordes de fotos rectangulares
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Escalar proporcionalmente sin recortar nada del producto
        const scale = Math.min(size / img.width, size / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const x = Math.round((size - w) / 2);
        const y = Math.round((size - h) / 2);

        ctx.drawImage(img, x, y, w, h);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
