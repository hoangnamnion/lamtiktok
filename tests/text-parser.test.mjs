import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTextToTokens, applyAlternateParagraphColors, serializeTokensToHtml } from '../src/text-parser.js';

test('Suite 1: Text & Color Tokenizer', async (t) => {
  await t.test('1.1: parseTextToTokens should parse plain multiline text to default color 1', () => {
    const raw = "Dòng 1\nDòng 2";
    const result = parseTextToTokens(raw);
    assert.equal(result.length, 2);
    assert.equal(result[0].tokens[0].text, 'Dòng 1');
    assert.equal(result[0].tokens[0].colorId, 1);
    assert.equal(result[1].tokens[0].text, 'Dòng 2');
    assert.equal(result[1].tokens[0].colorId, 1);
  });

  await t.test('1.2: parseTextToTokens should parse HTML with data-color spans', () => {
    const html = `<div><span data-color="2">Khi bạn đi học</span> <span data-color="1">đi làm</span></div><div><span data-color="2">mệt mỏi</span></div>`;
    const result = parseTextToTokens(html);
    assert.equal(result.length, 2);
    assert.equal(result[0].tokens.length, 2);
    assert.equal(result[0].tokens[0].text.trim(), 'Khi bạn đi học');
    assert.equal(result[0].tokens[0].colorId, 2);
    assert.equal(result[0].tokens[1].text.trim(), 'đi làm');
    assert.equal(result[0].tokens[1].colorId, 1);
  });

  await t.test('1.3: applyAlternateParagraphColors should alternate colors between paragraphs separated by empty lines', () => {
    const lines = [
      { tokens: [{ text: 'Đoạn 1 dòng 1', colorId: 1 }] },
      { tokens: [{ text: 'Đoạn 1 dòng 2', colorId: 1 }] },
      { tokens: [{ text: '', colorId: 1 }] },
      { tokens: [{ text: 'Đoạn 2 dòng 1', colorId: 1 }] },
      { tokens: [{ text: '', colorId: 1 }] },
      { tokens: [{ text: 'Đoạn 3 dòng 1', colorId: 1 }] }
    ];
    const formatted = applyAlternateParagraphColors(lines, [2, 1]);
    assert.equal(formatted[0].tokens[0].colorId, 2);
    assert.equal(formatted[1].tokens[0].colorId, 2);
    assert.equal(formatted[3].tokens[0].colorId, 1);
    assert.equal(formatted[5].tokens[0].colorId, 2);
  });

  await t.test('1.4: serializeTokensToHtml converts tokens back to editable HTML', () => {
    const lines = [
      { tokens: [{ text: 'Đoạn 1', colorId: 2 }, { text: ' Highlight', colorId: 1 }] },
      { tokens: [{ text: '', colorId: 1 }] }
    ];
    const html = serializeTokensToHtml(lines);
    assert.ok(html.includes('data-color="2"'));
    assert.ok(html.includes('data-color="1"'));
    assert.ok(html.includes('Đoạn 1'));
  });
});
