import { describe, expect, it } from 'vitest';
import { ReorderHarness } from './harness/reorder';

describe('useReorder', () => {
  it('starts dragging after the threshold, tracks the target index and commits on release', async () => {
    const list = ReorderHarness.mount();
    await list.pointerDown(1, 60);
    expect(list.state.phase).toBe('pending');
    await list.pointerMove(63);
    expect(list.state.phase).toBe('pending');
    expect(await list.pointerMove(130)).toBe(true);
    expect(list.state).toEqual({ phase: 'dragging', from: 1, to: 3, position: 130 });
    await list.pointerMove(190);
    expect(list.state.to).toBe(4);
    await list.pointerUp(190);
    expect(list.state.phase).toBe('idle');
    expect(list.moves).toEqual([[1, 4]]);
    list.unmount();
  });

  it('ignores drops on the origin, other pointers, cancelled drags and Escape', async () => {
    const list = ReorderHarness.mount();
    await list.pointerDown(2, 100);
    await list.pointerMove(150);
    await list.pointerMove(100);
    await list.pointerUp(100);
    expect(list.moves).toEqual([]);
    await list.pointerDown(0, 10);
    await list.pointerMove(150);
    await list.pointerCancel();
    expect(list.state.phase).toBe('idle');
    await list.pointerDown(0, 10);
    await list.pointerMove(150);
    await list.pressWindow('Escape');
    expect(list.state.phase).toBe('idle');
    await list.pointerUp(150);
    expect(list.moves).toEqual([]);
    list.unmount();
  });

  it('respects canMove while dragging and keeps the last allowed target', async () => {
    const list = ReorderHarness.mount({ canMove: (_from, to) => to < 3 });
    await list.pointerDown(0, 10);
    await list.pointerMove(90);
    expect(list.state.to).toBe(2);
    await list.pointerMove(170);
    expect(list.state.to).toBe(2);
    await list.pointerUp(170);
    expect(list.moves).toEqual([[0, 2]]);
    list.unmount();
  });

  it('moves with the keyboard: Space grabs, arrows move within bounds, Space drops, Escape cancels', async () => {
    const list = ReorderHarness.mount();
    expect(await list.press(1, 'ArrowDown')).toBe(false);
    expect(await list.press(1, ' ')).toBe(true);
    expect(list.state).toEqual({ phase: 'keyboard', from: 1, to: 1, position: 0 });
    await list.press(1, 'ArrowDown');
    await list.press(1, 'ArrowDown');
    expect(list.state.to).toBe(3);
    await list.press(1, 'ArrowUp');
    expect(list.state.to).toBe(2);
    expect(await list.press(2, 'ArrowDown')).toBe(false);
    await list.press(1, 'ArrowUp');
    await list.press(1, 'ArrowUp');
    await list.press(1, 'ArrowUp');
    expect(list.state.to).toBe(0);
    await list.press(1, 'Enter');
    expect(list.moves).toEqual([[1, 0]]);
    expect(list.state.phase).toBe('idle');
    await list.press(3, ' ');
    await list.press(3, 'ArrowDown');
    await list.press(3, 'Escape');
    expect(list.state.phase).toBe('idle');
    expect(list.moves).toEqual([[1, 0]]);
    expect(list.changes.at(-1)?.phase).toBe('idle');
    list.unmount();
  });

  it('swaps horizontal arrows in RTL', async () => {
    const list = ReorderHarness.mount({ axis: 'x', rtl: true });
    await list.press(2, ' ');
    await list.press(2, 'ArrowLeft');
    expect(list.state.to).toBe(3);
    await list.press(2, 'ArrowRight');
    await list.press(2, 'ArrowRight');
    expect(list.state.to).toBe(1);
    list.unmount();
    const ltr = ReorderHarness.mount({ axis: 'x' });
    await ltr.press(2, ' ');
    await ltr.press(2, 'ArrowRight');
    expect(ltr.state.to).toBe(3);
    ltr.unmount();
  });
});
