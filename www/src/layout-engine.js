/**
 * Module tính toán Layout và Wrap dòng cho Canvas
 */

/**
 * Tự động ngắt dòng các tokens sao cho không vượt quá `maxLineWidth`, bảo toàn `colorId` cho từng từ
 * @param {Array<{ tokens: Array<{ text: string, colorId: number }> }>} inputLines
 * @param {number} maxLineWidth - Chiều rộng tối đa cho phép của 1 dòng
 * @param {Function} measureTextFn - Hàm đo chiều rộng của text: (str) => { width: number }
 * @returns {Array<{ tokens: Array<{ text: string, colorId: number }> }>}
 */
export function calculateWrappedLines(inputLines, maxLineWidth, measureTextFn) {
  const resultLines = [];

  for (const lineObj of inputLines) {
    // Nếu dòng trống (ngắt đoạn)
    const isLineEmpty = lineObj.tokens.every(t => !t.text || t.text.trim() === '');
    if (isLineEmpty) {
      resultLines.push({ tokens: [{ text: '', colorId: 1 }] });
      continue;
    }

    // Tách dòng này thành các đơn vị "word tokens" (từ + khoảng trắng)
    const wordTokens = [];
    for (const token of lineObj.tokens) {
      // Tách từng từ giữ nguyên khoảng trắng
      const words = token.text.split(/(\s+)/);
      for (const word of words) {
        if (word.length > 0) {
          wordTokens.push({ text: word, colorId: token.colorId });
        }
      }
    }

    // Tiến hành gom từ vào từng dòng theo giới hạn maxLineWidth
    let currentLineTokens = [];
    let currentLineWidth = 0;

    for (const wt of wordTokens) {
      const wordWidth = measureTextFn(wt.text).width;

      if (currentLineWidth + wordWidth <= maxLineWidth || currentLineTokens.length === 0) {
        currentLineTokens.push(wt);
        currentLineWidth += wordWidth;
      } else {
        // Xuống dòng mới
        resultLines.push({ tokens: currentLineTokens });
        currentLineTokens = [wt];
        currentLineWidth = wordWidth;
      }
    }

    if (currentLineTokens.length > 0) {
      resultLines.push({ tokens: currentLineTokens });
    }
  }

  return resultLines;
}

/**
 * Tính toán vị trí căn giữa theo chiều dọc
 * @param {Object} params
 * @param {number} params.lineCount - Tổng số dòng
 * @param {number} params.lineHeight - Chiều cao 1 dòng
 * @param {number} params.paragraphBreakCount - Số lần ngắt đoạn trống
 * @param {number} params.paragraphSpacing - Khoảng cách bổ sung khi ngắt đoạn
 * @param {number} params.canvasHeight - Chiều cao canvas (1560)
 * @returns {{ startY: number, totalHeight: number }}
 */
export function calculateVerticalPosition({
  lineCount,
  lineHeight,
  paragraphBreakCount = 0,
  paragraphSpacing = 0,
  canvasHeight = 1560
}) {
  const totalHeight = (lineCount * lineHeight) + (paragraphBreakCount * paragraphSpacing);
  const startY = Math.max(80, (canvasHeight - totalHeight) / 2);
  return { startY, totalHeight };
}
