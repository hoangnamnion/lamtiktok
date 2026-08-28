import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExportFilename } from '../src/export-helper.js';

test('Suite 3: Export Helpers', async (t) => {
  await t.test('3.1: generateExportFilename should format correctly', () => {
    const fixedDate = new Date('2026-08-28T23:30:00');
    const filename = generateExportFilename(fixedDate);
    assert.match(filename, /^tiktok-quote-20260828-\d{6}\.png$/);
  });
});
