import { parseTextToTokens, serializeTokensToHtml } from './src/text-parser.js';
import { calculateWrappedLines, calculateVerticalPosition } from './src/layout-engine.js';
import { saveImageToGallery, generateExportFilename } from './src/export-helper.js';

// DOM Elements
const quoteEditor = document.getElementById('quoteEditor');
const authorTag = document.getElementById('authorTag');
const storyBgLayer = document.getElementById('storyBgLayer');
const exportCanvas = document.getElementById('exportCanvas');
const exportCtx = exportCanvas.getContext('2d');

// Top Buttons
const btnColor1 = document.getElementById('btnColor1');
const btnColor2 = document.getElementById('btnColor2');
const btnSaveGallery = document.getElementById('btnSaveGallery');
const toastContainer = document.getElementById('toastContainer');

// Fixed Default State (Tối ưu chuẩn 100% theo nen.jpg & nenstt.jpg)
const state = {
  fontFamily: "'Be Vietnam Pro', sans-serif",
  fontSize: 48,
  lineHeight: 1.65,
  paragraphSpacing: 42,
  textAlign: 'left',
  color1: '#ffffff',
  color2: '#b59e9e',
  darkOverlay: 0,
  vignette: 0,
  bgImage: null,
  bgImageSrc: 'nen.jpg',
  authorTag: '#nam_26th4'
};

// Helper: Show Toast Notification
function showToast(message, icon = '✓') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// Sync Editor Color Spans & Author Tag Visibility
function syncEditorStyles() {
  document.querySelectorAll('#quoteEditor span[data-color="1"]').forEach(el => {
    el.style.color = state.color1;
  });
  document.querySelectorAll('#quoteEditor span[data-color="2"]').forEach(el => {
    el.style.color = state.color2;
  });

  const hasText = quoteEditor.innerText.trim().length > 0;
  if (authorTag) {
    authorTag.style.display = hasText ? 'block' : 'none';
  }
}

// Load background image
function loadBackgroundImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.bgImage = img;
      storyBgLayer.style.backgroundImage = `url('${src}')`;
      resolve(img);
    };
    img.onerror = () => {
      console.warn('Không tải được ảnh nền:', src);
      storyBgLayer.style.backgroundColor = '#150608';
      state.bgImage = null;
      resolve(null);
    };
    img.src = src;
  });
}

// Render Full HD Canvas (1080 x 1920) for Export
function renderExportCanvas() {
  const canvasWidth = 1080;
  const canvasHeight = 1920;
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;

  // 1. Vẽ ảnh nền nen.jpg nguyên bản 100% không đổi màu
  if (state.bgImage) {
    const img = state.bgImage;
    const imgAspect = img.width / img.height;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawW, drawH, drawX, drawY;
    if (imgAspect > canvasAspect) {
      drawH = canvasHeight;
      drawW = canvasHeight * imgAspect;
      drawX = (canvasWidth - drawW) / 2;
      drawY = 0;
    } else {
      drawW = canvasWidth;
      drawH = canvasWidth / imgAspect;
      drawX = 0;
      drawY = (canvasHeight - drawH) / 2;
    }
    exportCtx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    exportCtx.fillStyle = '#150608';
    exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 4. Lấy tokens từ Direct Editor
  const rawHtml = quoteEditor.innerHTML || quoteEditor.innerText || '';
  const parsedLines = parseTextToTokens(rawHtml);

  // 5. Cấu hình Typography cho Canvas
  const fontSize = state.fontSize;
  const lineSpacing = fontSize * state.lineHeight;
  const paragraphSpacing = state.paragraphSpacing;
  const fontFamily = state.fontFamily;
  const paddingX = 110;
  const maxLineWidth = canvasWidth - (paddingX * 2);

  exportCtx.font = `350 ${fontSize}px ${fontFamily}`;
  exportCtx.textBaseline = 'middle';

  // 6. Wrap dòng
  const wrappedLines = calculateWrappedLines(
    parsedLines,
    maxLineWidth,
    (str) => exportCtx.measureText(str)
  );

  // 7. Căn giữa theo chiều dọc
  let paragraphBreaks = 0;
  let textLineCount = 0;
  wrappedLines.forEach(line => {
    const isEmpty = line.tokens.every(t => !t.text || t.text.trim() === '');
    if (isEmpty) paragraphBreaks++;
    else textLineCount++;
  });

  // Có thêm chữ ký tác giả #nam_26th4 thì thêm một chút khoảng trống
  const authorTagHeight = textLineCount > 0 ? 50 : 0;

  const { startY } = calculateVerticalPosition({
    lineCount: textLineCount,
    lineHeight: lineSpacing,
    paragraphBreakCount: paragraphBreaks,
    paragraphSpacing: paragraphSpacing,
    canvasHeight: canvasHeight - authorTagHeight
  });

  // 8. Vẽ từng dòng chữ
  let currentY = startY;

  for (const line of wrappedLines) {
    const isEmpty = line.tokens.every(t => !t.text || t.text.trim() === '');
    if (isEmpty) {
      currentY += paragraphSpacing;
      continue;
    }

    let lineWidth = 0;
    line.tokens.forEach(tok => {
      lineWidth += exportCtx.measureText(tok.text).width;
    });

    let currentX = paddingX;
    if (state.textAlign === 'center') {
      currentX = (canvasWidth - lineWidth) / 2;
    } else if (state.textAlign === 'right') {
      currentX = canvasWidth - paddingX - lineWidth;
    }

    for (const tok of line.tokens) {
      const textColor = tok.colorId === 2 ? state.color2 : state.color1;
      exportCtx.fillStyle = textColor;
      exportCtx.fillText(tok.text, currentX, currentY);
      currentX += exportCtx.measureText(tok.text).width;
    }

    currentY += lineSpacing;
  }

  // 9. Vẽ Chữ ký tác giả #nam_26th4 dưới dòng cuối cùng (Căn phải, nhích sang trái 1 chút)
  if (textLineCount > 0 && state.authorTag) {
    currentY += 20;
    exportCtx.font = `400 32px ${fontFamily}`;
    exportCtx.fillStyle = '#8e8e99';
    const tagWidth = exportCtx.measureText(state.authorTag).width;
    const tagX = canvasWidth - paddingX - 50 - tagWidth;
    exportCtx.fillText(state.authorTag, tagX, currentY);
  }
}

// Bôi đen đổi màu trực tiếp trên ảnh
function applyColorToSelection(colorId) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) {
    showToast('Vui lòng bôi đen chữ trên ảnh!', 'ℹ️');
    return;
  }

  const range = selection.getRangeAt(0);
  if (!quoteEditor.contains(range.commonAncestorContainer)) {
    showToast('Vui lòng chọn chữ trong khung ảnh', '⚠️');
    return;
  }

  const selectedText = range.toString();
  if (!selectedText) return;

  const span = document.createElement('span');
  span.setAttribute('data-color', colorId);
  span.style.color = colorId === 1 ? state.color1 : state.color2;
  span.textContent = selectedText;

  range.deleteContents();
  range.insertNode(span);

  selection.removeAllRanges();
  syncEditorStyles();
  showToast(`Đã đổi sang Màu ${colorId === 1 ? '1 (Trắng)' : '2 (Xám)'}`);
}

// Event Listeners
btnColor1.addEventListener('click', () => applyColorToSelection(1));
btnColor2.addEventListener('click', () => applyColorToSelection(2));

quoteEditor.addEventListener('input', () => {
  syncEditorStyles();
});

// Lưu ảnh vào thư viện máy
btnSaveGallery.addEventListener('click', async () => {
  btnSaveGallery.disabled = true;
  btnSaveGallery.style.opacity = '0.7';

  try {
    if (document.fonts) await document.fonts.ready;
    renderExportCanvas();

    const dataUrl = exportCanvas.toDataURL('image/png');

    exportCanvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('Không thể tạo ảnh, thử lại nhé', '❌');
        btnSaveGallery.disabled = false;
        btnSaveGallery.style.opacity = '1';
        return;
      }

      const filename = generateExportFilename();
      const res = await saveImageToGallery(blob, filename, dataUrl);
      if (res.success) {
        if (res.method === 'native-photos') {
          showToast('✓ Đã lưu thẳng vào Thư viện Ảnh (Photos)!', '🎉');
        } else if (res.method === 'share') {
          showToast('Đã mở bảng lưu vào Thư viện ảnh!', '🎉');
        } else {
          showToast('Đã tải ảnh HD về máy!', '📥');
        }
      }
      btnSaveGallery.disabled = false;
      btnSaveGallery.style.opacity = '1';
    }, 'image/png');
  } catch (err) {
    console.error(err);
    showToast('Lỗi khi lưu ảnh', '❌');
    btnSaveGallery.disabled = false;
    btnSaveGallery.style.opacity = '1';
  }
});

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  if (document.fonts) {
    await document.fonts.ready;
  }
  await loadBackgroundImage('nen.jpg');
  quoteEditor.innerHTML = '';
  syncEditorStyles();

  // Xin quyền truy cập Thư viện Ảnh ngay khi mở App trên iOS Native
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const Media = window.Capacitor.Plugins?.Media;
      if (Media && typeof Media.checkPermissions === 'function') {
        const perm = await Media.checkPermissions();
        if (perm?.photos !== 'granted') {
          await Media.requestPermissions({ permissions: ['photos'] });
        }
      }
    } catch (e) {
      // Thử qua @capacitor/filesystem nếu plugin Media không hỗ trợ checkPermissions
      try {
        const Filesystem = window.Capacitor.Plugins?.Filesystem;
        if (Filesystem && typeof Filesystem.checkPermissions === 'function') {
          const fsPerm = await Filesystem.checkPermissions();
          if (fsPerm?.publicStorage !== 'granted') {
            await Filesystem.requestPermissions();
          }
        }
      } catch (_) {}
    }
  }
});
