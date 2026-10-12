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
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Fondo blanco para imágenes PNG con transparencia (JPEG no soporta alfa)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
