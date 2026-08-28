/**
 * Module tiện ích xuất và lưu ảnh vào thư viện máy chống crash 100%
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
  const base64Data = dataUrl || (await blobToDataUrl(blob));

  // 1. Kiểm tra môi trường Native Capacitor iOS App -> Lưu THẲNG vào Photos (Camera Roll)
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    // Thử lưu qua @capacitor-community/media
    try {
      const Media = window.Capacitor.Plugins?.Media;
      if (Media && typeof Media.savePhoto === 'function') {
        await Media.savePhoto({
          path: base64Data,
          albumName: 'TikTok Quotes'
        });
        return { success: true, method: 'native-photos' };
      }
    } catch (mediaErr) {
      console.warn('Lỗi plugin Media, chuyển sang lưu qua Filesystem / Share:', mediaErr);
    }

    // Thử fallback qua Filesystem + Share Native của iOS
    try {
      const Filesystem = window.Capacitor.Plugins?.Filesystem;
      const Share = window.Capacitor.Plugins?.Share;
      if (Filesystem && Share) {
        const rawBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: rawBase64,
          directory: 'CACHE'
        });

        if (savedFile && savedFile.uri) {
          await Share.share({
            title: 'Lưu ảnh Status TikTok',
            url: savedFile.uri
          });
          return { success: true, method: 'share' };
        }
      }
    } catch (fsErr) {
      console.warn('Lỗi Filesystem / Share Native:', fsErr);
    }
  }

  // 2. Web Share API (Safari iOS / Android Browser)
  const file = new File([blob], filename, { type: 'image/png' });
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

  // 3. Fallback tải file qua thẻ <a>
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
