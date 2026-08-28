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
 * @returns {Promise<{ success: boolean, method: 'share' | 'download' }>}
 */
export async function saveImageToGallery(blob, filename = generateExportFilename()) {
  const file = new File([blob], filename, { type: 'image/png' });

  // 1. Kiểm tra Web Share API với files (hỗ trợ lưu thẳng vào Photos trên iOS Safari & Android)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Lưu ảnh Status TikTok',
        text: 'Ảnh Status 9:16 chất lượng cao'
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'share', cancelled: true };
      }
      console.warn('Web Share thất bại, chuyển sang phương thức tải file:', err);
    }
  }

  // 2. Fallback tải trực tiếp
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
