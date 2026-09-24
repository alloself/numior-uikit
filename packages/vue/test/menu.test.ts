import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NuiMenuEntry } from '../src';
import { MenuDriver } from './drivers/menu';

describe('NuiMenu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is a native popover menu labelled by its trigger that opens from the keyboard onto the first or last item', async () => {
    const menu = MenuDriver.mount({ parts: true, props: { id: 'actions' } });
    expect(menu.trigger.attributes('aria-haspopup')).toBe('menu');
    expect(menu.trigger.attributes('popovertarget')).toBe('actions');
    expect(menu.menu.attributes('role')).toBe('menu');
    expect(menu.menu.attributes('popover')).toBe('auto');
    expect(menu.menu.attributes('aria-labelledby')).toBe('actions-trigger');
    await menu.pressTrigger('ArrowDown');
    expect(menu.isOpen).toBe(true);
    expect(menu.focusedLabel).toBe('Rename');
    await menu.close();
    expect(menu.triggerFocused).toBe(true);
    await menu.pressTrigger('ArrowUp');
    expect(menu.focusedLabel).toBe('Delete');
    menu.unmount();
  });

  it('moves with arrows, Home, End and typeahead, skipping disabled items and looping', async () => {
    const menu = MenuDriver.mount({ parts: true });
    await menu.pressTrigger('ArrowDown');
    await menu.press('ArrowDown');
    expect(menu.focusedLabel).toBe('Docs');
    await menu.press('End');
    expect(menu.focusedLabel).toBe('Delete');
    await menu.press('ArrowDown');
    expect(menu.focusedLabel).toBe('Rename');
    await menu.press('s');
    expect(menu.focusedLabel).toBe('Share');
    await menu.press('Home');
    expect(menu.focusedLabel).toBe('Rename');
    menu.unmount();
  });

  it('follows the pointer, drops the highlight when it leaves and returns focus to the trigger on close', async () => {
    const menu = MenuDriver.mount({ parts: true });
    await menu.open();
    expect(menu.focusedLabel).toBe('menu');
    await menu.hover('Bold');
    expect(menu.focusedLabel).toBe('Bold');
    await menu.leave();
    expect(menu.focusedLabel).toBe('menu');
    await menu.dismissNatively();
    expect(menu.isOpen).toBe(false);
    expect(menu.triggerFocused).toBe(true);
    menu.unmount();
  });

  it('selects items and closes, toggles checkbox items in place and picks radio items', async () => {
    const menu = MenuDriver.mount({ parts: true });
    await menu.open();
    await menu.click('Rename');
    expect(menu.selections).toEqual(['Rename']);
    expect(menu.isOpen).toBe(false);
    await menu.open();
    await menu.click('Locked');
    expect(menu.selections).toEqual(['Rename']);
    expect(menu.isOpen).toBe(true);
    await menu.click('Bold');
    expect(menu.bold).toBe(true);
    expect(menu.checked('Bold')).toBe('true');
    expect(menu.isOpen).toBe(true);
    await menu.click('Center');
    expect(menu.align).toBe('center');
    expect(menu.isOpen).toBe(false);
    await menu.open();
    expect(menu.checked('Center')).toBe('true');
    expect(menu.checked('Left')).toBe('false');
    expect(menu.hrefOf('Docs')).toBe('/docs');
    menu.unmount();
  });

  it('opens a submenu on hover after the delay or with ArrowRight and steps back with ArrowLeft', async () => {
    const menu = MenuDriver.mount({ parts: true });
    await menu.open();
    await menu.hoverSub('Share');
    expect(menu.subOpen('Share')).toBe(false);
    await menu.advance(100);
    expect(menu.subOpen('Share')).toBe(true);
    await menu.leaveSub('Share');
    await menu.advance(300);
    expect(menu.subOpen('Share')).toBe(false);
    await menu.hover('Share');
    await menu.press('ArrowRight');
    expect(menu.subOpen('Share')).toBe(true);
    expect(menu.focusedLabel).toBe('Email');
    await menu.press('ArrowDown');
    expect(menu.focusedLabel).toBe('Link');
    await menu.press('ArrowLeft');
    expect(menu.subOpen('Share')).toBe(false);
    expect(menu.focusedLabel).toBe('Share');
    await menu.press('ArrowRight');
    await menu.click('Email');
    expect(menu.selections).toEqual(['Email']);
    expect(menu.isOpen).toBe(false);
    menu.unmount();
  });

  it('renders data entries as parts and hides on Tab', async () => {
    const log: string[] = [];

    const entries: NuiMenuEntry[] = [
      { label: 'Copy', shortcut: '⌘C', onSelect: () => log.push('Copy') },
      { type: 'separator' },
      { type: 'label', label: 'View' },
      {
        type: 'checkbox',
        label: 'Grid',
        checked: true,
        onCheckedChange: (checked) => log.push(`grid:${checked}`),
      },
      {
        type: 'radio-group',
        value: 'a',
        onChange: (value) => log.push(`sort:${value}`),
        items: [
          { value: 'a', label: 'Name' },
          { value: 'b', label: 'Date' },
        ],
      },
      { type: 'sub', label: 'Export', items: [{ label: 'PDF', onSelect: () => log.push('PDF') }] },
    ];

    const menu = MenuDriver.mount({ entries });
    await menu.open();
    expect(menu.labels).toEqual(['Copy', 'Grid', 'Name', 'Date', 'Export']);
    expect(menu.checked('Grid')).toBe('true');
    await menu.click('Grid');
    expect(log).toEqual(['grid:false']);
    await menu.click('Date');
    expect(log).toEqual(['grid:false', 'sort:b']);
    expect(menu.isOpen).toBe(false);
    await menu.open();
    await menu.hover('Copy');
    await menu.press('Tab');
    expect(menu.isOpen).toBe(false);
    menu.unmount();
  });
});
