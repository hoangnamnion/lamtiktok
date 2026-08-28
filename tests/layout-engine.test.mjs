import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWrappedLines, calculateVerticalPosition } from '../src/layout-engine.js';

test('Suite 2: 9:16 Canvas Layout & Word Wrapping', async (t) => {
  // Mock measureText function based on approximate char width
  const measureTextMock = (text) => ({ width: text.length * 20 });

  await t.test('2.1: calculateWrappedLines should wrap long line exceeding max width while preserving colorId', () => {
    const inputLines = [
      {
        tokens: [
          { text: 'Đây là một câu rất dài ', colorId: 2 },
          { text: 'cần phải được tự động xuống dòng trên 9:16', colorId: 1 }
        ]
      }
    ];
    // max width = 300 (which fits ~15 chars per line)
    const wrapped = calculateWrappedLines(inputLines, 300, measureTextMock);
    assert.ok(wrapped.length > 1, 'Should wrap into multiple lines');
    // Ensure all words still have colorId
    wrapped.forEach(line => {
      line.tokens.forEach(tok => {
        assert.ok(tok.colorId === 1 || tok.colorId === 2);
      });
    });
  });

  await t.test('2.2: calculateVerticalPosition should center content in 1920 height', () => {
    const lineCount = 5;
    const lineHeight = 60;
    const paragraphBreakCount = 2;
    const paragraphSpacing = 40;
    const canvasHeight = 1920;

    const { startY, totalHeight } = calculateVerticalPosition({
      lineCount,
      lineHeight,
      paragraphBreakCount,
      paragraphSpacing,
      canvasHeight
    });

    const expectedTotalHeight = (5 * 60) + (2 * 40); // 300 + 80 = 380
    assert.equal(totalHeight, expectedTotalHeight);
    const expectedStartY = (1920 - 380) / 2;
    assert.equal(startY, expectedStartY);
  });
});
