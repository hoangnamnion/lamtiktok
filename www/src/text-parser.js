/**
 * Module xử lý parsing và tokenization cho text 2 màu
 */

/**
 * Phân tích text hoặc HTML thành mảng các dòng và tokens có thuộc tính `colorId` (1 hoặc 2)
 * @param {string} input - Chuỗi text thuần hoặc HTML từ contenteditable
 * @returns {Array<{ tokens: Array<{ text: string, colorId: number }> }>}
 */
export function parseTextToTokens(input) {
  if (!input) return [{ tokens: [{ text: '', colorId: 1 }] }];

  // 1. Trình duyệt / DOMParser: Bóc tách cấu trúc DOM chuẩn xác 100%, chống hoàn toàn lỗi lọt tag HTML
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input.replace(/\n/g, '<br>'), 'text/html');
    const root = doc.body;

    const lines = [];
    let currentLineTokens = [];

    function pushCurrentLine() {
      if (currentLineTokens.length === 0) {
        lines.push({ tokens: [{ text: '', colorId: 1 }] });
      } else {
        lines.push({ tokens: currentLineTokens });
        currentLineTokens = [];
      }
    }

    function determineColorId(el) {
      let current = el;
      while (current && current !== root) {
        if (current.getAttribute) {
          const dataColor = current.getAttribute('data-color');
          if (dataColor === '2') return 2;
          if (dataColor === '1') return 1;

          const colorAttr = (current.getAttribute('color') || '').toLowerCase();
          const styleColor = (current.style && current.style.color || '').toLowerCase();

          // Nhận diện mã màu phụ (xám tro/mờ)
          if (
            colorAttr.includes('b8a8a8') ||
            styleColor.includes('184, 168, 168') ||
            styleColor.includes('b8a8a8') ||
            styleColor.includes('a38e8e') ||
            styleColor.includes('grey') ||
            styleColor.includes('gray')
          ) {
            return 2;
          }
        }
        current = current.parentElement;
      }
      return 1;
    }

    function traverse(node) {
      if (node.nodeType === 3) { // Text node
        const text = node.nodeValue;
        if (text) {
          const colorId = determineColorId(node.parentElement);
          currentLineTokens.push({ text, colorId });
        }
      } else if (node.nodeType === 1) { // Element node
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') {
          pushCurrentLine();
        } else if (tag === 'div' || tag === 'p') {
          if (currentLineTokens.length > 0) {
            pushCurrentLine();
          }
          for (const child of node.childNodes) {
            traverse(child);
          }
          if (currentLineTokens.length > 0) {
            pushCurrentLine();
          }
        } else {
          for (const child of node.childNodes) {
            traverse(child);
          }
        }
      }
    }

    for (const child of root.childNodes) {
      traverse(child);
    }
    if (currentLineTokens.length > 0) {
      pushCurrentLine();
    }

    return lines.length > 0 ? lines : [{ tokens: [{ text: '', colorId: 1 }] }];
  }

  // 2. Fallback cho môi trường Node.js / Server không có DOM
  const rawLines = input
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/div><div>/gi, '\n')
    .replace(/<div>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/\r\n/g, '\n')
    .split('\n');

  const result = [];
  for (const line of rawLines) {
    if (!line) {
      result.push({ tokens: [{ text: '', colorId: 1 }] });
      continue;
    }

    // Tách các tag HTML và text
    const tokens = [];
    const parts = line.split(/(<[^>]+>)/g);
    let currentColorId = 1;

    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('<')) {
        // Tag HTML
        if (/data-color=["']2["']|color=["']#?(b8a8a8|a38e8e)["']/i.test(part)) {
          currentColorId = 2;
        } else if (/data-color=["']1["']|color=["']#?ffffff["']/i.test(part)) {
          currentColorId = 1;
        } else if (/^<\/(span|font)>/i.test(part)) {
          currentColorId = 1;
        }
      } else {
        // Text trần
        const text = part
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        if (text) tokens.push({ text, colorId: currentColorId });
      }
    }

    if (tokens.length === 0) {
      tokens.push({ text: '', colorId: 1 });
    }
    result.push({ tokens });
  }

  return result;
}

/**
 * Tự động đổi màu xen kẽ giữa các đoạn (phân tách bởi dòng trống)
 * Mẫu chuẩn: Đoạn 1 (màu 2 - xám mờ), Đoạn 2 (màu 1 - trắng), Đoạn 3 (màu 2), Đoạn 4 (màu 1)
 * @param {Array<{ tokens: Array<{ text: string, colorId: number }> }>} lines
 * @param {Array<number>} colorPattern - Mảng chu kỳ màu, vd [2, 1]
 */
export function applyAlternateParagraphColors(lines, colorPattern = [2, 1]) {
  let paragraphIndex = 0;
  let inParagraph = false;

  return lines.map(line => {
    const isLineEmpty = line.tokens.every(t => !t.text || t.text.trim() === '');
    if (isLineEmpty) {
      inParagraph = false;
      return { tokens: [{ text: '', colorId: 1 }] };
    }

    if (!inParagraph) {
      inParagraph = true;
      paragraphIndex++;
    }

    const assignedColor = colorPattern[(paragraphIndex - 1) % colorPattern.length];
    return {
      tokens: line.tokens.map(tok => ({
        ...tok,
        colorId: assignedColor
      }))
    };
  });
}

/**
 * Chuyển đổi tokens sang chuỗi HTML hiển thị trong ContentEditable editor
 * @param {Array<{ tokens: Array<{ text: string, colorId: number }> }>} lines
 */
export function serializeTokensToHtml(lines) {
  return lines.map(line => {
    const lineHtml = line.tokens.map(tok => {
      const escaped = tok.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<span data-color="${tok.colorId}">${escaped}</span>`;
    }).join('');

    return `<div>${lineHtml || '<br>'}</div>`;
  }).join('');
}
