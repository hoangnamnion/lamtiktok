import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSnapPoint, getSnapHeight } from '../src/bottom-sheet.js';

test('Suite 4: Bottom Sheet Snap Points & Touch Calculator', async (t) => {
  const windowHeight = 800;
  const snapHeights = {
    collapsed: 110,
    half: 400,
    expanded: 700
  };

  await t.test('4.1: getSnapHeight should return exact height in px', () => {
    assert.equal(getSnapHeight('collapsed', windowHeight), 110);
    assert.equal(getSnapHeight('half', windowHeight), 400);
    assert.equal(getSnapHeight('expanded', windowHeight), 700);
  });

  await t.test('4.2: calculateSnapPoint should snap to nearest state based on current height and drag velocity', () => {
    // Current height 200 dragging up -> should snap to 'half'
    const snap1 = calculateSnapPoint({ currentHeight: 250, velocityY: -1, windowHeight });
    assert.equal(snap1, 'half');

    // Current height 550 dragging up -> should snap to 'expanded'
    const snap2 = calculateSnapPoint({ currentHeight: 550, velocityY: -1, windowHeight });
    assert.equal(snap2, 'expanded');

    // Current height 300 dragging down -> should snap to 'collapsed'
    const snap3 = calculateSnapPoint({ currentHeight: 300, velocityY: 1, windowHeight });
    assert.equal(snap3, 'collapsed');
  });
});
