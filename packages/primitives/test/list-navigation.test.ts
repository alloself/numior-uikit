import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListHarness } from './harness/list';

describe('useListNavigation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('roves focus with arrows, Home and End, skipping disabled items and clamping at the edges', () => {
    const list = ListHarness.mount({ disabled: [1] });
    expect(list.press('ArrowDown')).toBe(true);
    expect(list.focusedText).toBe('Apple');
    list.press('ArrowDown');
    expect(list.focusedText).toBe('Blueberry');
    expect(list.tabIndexes).toEqual([-1, -1, 0, -1, -1]);
    list.press('End');
    expect(list.focusedText).toBe('Date');
    list.press('ArrowDown');
    expect(list.focusedText).toBe('Date');
    list.press('Home');
    expect(list.focusedText).toBe('Apple');
    list.press('ArrowUp');
    expect(list.focusedText).toBe('Apple');
    expect(list.press('Enter')).toBe(false);
    list.unmount();
  });

  it('wraps around when looping and pages by the page size without wrapping', () => {
    const list = ListHarness.mount({ loop: true, pageSize: 3 });
    list.press('ArrowUp');
    expect(list.focusedText).toBe('Date');
    list.press('ArrowDown');
    expect(list.focusedText).toBe('Apple');
    list.press('PageDown');
    expect(list.focusedText).toBe('Cherry');
    list.press('PageDown');
    expect(list.focusedText).toBe('Date');
    list.press('PageUp');
    expect(list.focusedText).toBe('Banana');
    list.unmount();
  });

  it('follows the reading direction for horizontal lists only', () => {
    const rtl = ListHarness.mount({ orientation: 'horizontal', dir: 'rtl' });
    rtl.press('ArrowLeft');
    rtl.press('ArrowLeft');
    expect(rtl.focusedText).toBe('Banana');
    rtl.press('ArrowRight');
    expect(rtl.focusedText).toBe('Apple');
    expect(rtl.press('ArrowDown')).toBe(false);
    rtl.unmount();
    const vertical = ListHarness.mount({ dir: 'rtl' });
    vertical.press('ArrowDown');
    expect(vertical.focusedText).toBe('Apple');
    expect(vertical.press('ArrowLeft')).toBe(false);
    vertical.unmount();
  });

  it('jumps by typeahead, narrows within the reset window and cycles on a repeated letter', () => {
    const list = ListHarness.mount();
    list.type('b');
    expect(list.focusedText).toBe('Banana');
    list.type('l');
    expect(list.query).toBe('bl');
    expect(list.focusedText).toBe('Blueberry');
    list.advance(600);
    list.type('b');
    expect(list.focusedText).toBe('Banana');
    list.type('b');
    expect(list.focusedText).toBe('Blueberry');
    list.type('b');
    expect(list.focusedText).toBe('Banana');
    list.advance(600);
    expect(list.press(' ')).toBe(false);
    list.type('c');
    expect(list.press(' ')).toBe(true);
    list.unmount();
  });

  it('points aria-activedescendant at options in virtual mode without moving focus', () => {
    const list = ListHarness.mount({ mode: 'virtual' });
    list.press('ArrowDown');
    list.press('ArrowDown');
    expect(list.activeDescendant).toBe('item-1');
    expect(list.focusedText).toBeUndefined();
    expect(list.tabIndexes).toEqual([-1, -1, -1, -1, -1]);
    list.unmount();
  });

  it('adopts a pointer-focused item and starts over when the active one leaves', async () => {
    const list = ListHarness.mount();
    list.focusItem(3);
    expect(list.activeText).toBe('Cherry');
    expect(list.tabIndexes).toEqual([-1, -1, -1, 0, -1]);
    await list.remove(3);
    expect(list.activeText).toBeUndefined();
    list.press('ArrowDown');
    expect(list.focusedText).toBe('Apple');
    list.navigation.reset();
    expect(list.activeText).toBe('Apple');
    expect(list.query).toBe('');
    list.unmount();
  });

  it('activates an item by id before it exists and resolves it once rendered', async () => {
    const list = ListHarness.mount({ mode: 'virtual' });
    list.navigation.setActive('item-7', { focus: false });
    expect(list.activeDescendant).toBe('item-7');
    expect(list.activeText).toBeUndefined();
    await list.append('Elderberry', 'Fig', 'Grape');
    expect(list.activeText).toBe('Grape');
    list.press('ArrowUp');
    expect(list.activeDescendant).toBe('item-6');
    list.unmount();
  });
});
