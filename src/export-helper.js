/**
 * Module tiện ích xuất và lưu ảnh vào thư viện máy
 */

/**
 * Sinh tên file xuất ảnh theo thời gian thực tế
 * @param {Date} date
 * @returns {string}
 */
export function generateExportFilename(date = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `tiktok-quote-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
}

/**
 * Lưu ảnh trực tiếp vào Thư viện máy (Camera Roll / Gallery) hoặc Tải về
 * @param {Blob} blob - Ảnh Blob từ Canvas
 * @param {string} filename - Tên file
 * @param {string} [dataUrl] - Base64 Data URL từ Canvas
 * @returns {Promise<{ success: boolean, method: 'native-photos' | 'share' | 'download' }>}
 */
export async function saveImageToGallery(blob, filename = generateExportFilename(), dataUrl = '') {
  // 1. Kiểm tra môi trường Native Capacitor iOS App -> Lưu THẲNG vào ứng dụng Photos (Camera Roll)
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const Media = window.Capacitor.Plugins?.Media;
      if (Media && typeof Media.savePhoto === 'function') {
        const photoPath = dataUrl || (await blobToDataUrl(blob));
        await Media.savePhoto({
          path: photoPath,
          albumName: 'TikTok Quotes'
        });
        return { success: true, method: 'native-photos' };
      }
    } catch (nativeErr) {
      console.warn('Lỗi lưu qua plugin Native Media, thử fallback:', nativeErr);
    }
  }

  const file = new File([blob], filename, { type: 'image/png' });

  // 2. Web Share API (Safari iOS / Android Browser)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Lưu ảnh Status TikTok',
        text: 'Ảnh Status 9:16'
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'share', cancelled: true };
      }
      console.warn('Web Share thất bại, chuyển sang tải file:', err);
    }
  }

  // 3. Fallback tải file thông thường
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { success: true, method: 'download' };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
