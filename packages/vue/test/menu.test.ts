import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
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

  it('drops the minimum width when it is compact for icon-only lists', () => {
    const wide = MenuDriver.mount({ parts: true });
    const compact = MenuDriver.mount({ parts: true, props: { compact: true } });

    expect(wide.menu.classes()).not.toContain('nui-menu--compact');
    expect(compact.menu.classes()).toContain('nui-menu--compact');

    wide.unmount();
    compact.unmount();
  });

  it('fits its height into the room the viewport has so a long menu scrolls', async () => {
    const menu = MenuDriver.mount({ parts: true });

    await menu.pressTrigger('ArrowDown');
    await flushPromises();

    expect(menu.menu.element.style.getPropertyValue('max-block-size')).toMatch(/px$/u);

    menu.unmount();
  });

  it('opens at an external anchor from code onto the chosen item and returns focus to the anchor', async () => {
    const menu = MenuDriver.mount({ parts: true, anchored: true });
    await menu.focusAnchor();
    await menu.show('first');

    expect(menu.isOpen).toBe(true);
    expect(menu.focusedLabel).toBe('Rename');

    await menu.dismissNatively();
    expect(menu.isOpen).toBe(false);
    expect(menu.anchorFocused).toBe(true);

    await menu.show('last');
    expect(menu.focusedLabel).toBe('Delete');

    await menu.close();
    await menu.show();
    expect(menu.focusedLabel).toBe('menu');

    menu.unmount();
  });

  it('leaves the focus where the chosen item sent it once the menu is hidden', async () => {
    const field = document.createElement('button');

    const entries: NuiMenuEntry[] = [
      {
        label: 'Find',
        onSelect: () => {
          void Promise.resolve().then(() => {
            field.focus();
          });
        },
      },
    ];

    const menu = MenuDriver.mount({ entries, anchored: true });

    document.body.append(field);
    await menu.focusAnchor();
    await menu.show('first');

    await menu.click('Find');
    await flushPromises();

    expect(menu.isOpen).toBe(false);
    expect(document.activeElement).toBe(field);

    field.remove();
    menu.unmount();
  });

  it('focuses the requested item when the entries arrive together with the opening', async () => {
    const menu = MenuDriver.mount({ anchored: true, entries: [] });
    await menu.focusAnchor();
    await menu.showWith([{ label: 'Copy' }, { label: 'Paste' }], 'first');

    expect(menu.isOpen).toBe(true);
    expect(menu.focusedLabel).toBe('Copy');

    await menu.close();
    await menu.showWith([{ label: 'Cut' }, { label: 'Delete' }], 'last');
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

  it('starts over from the first item when it is opened again after its last item was reached', async () => {
    const menu = MenuDriver.mount({ parts: true });

    await menu.pressTrigger('ArrowDown');
    await menu.press('End');
    await menu.close();
    await menu.pressTrigger('ArrowDown');

    expect(menu.focusedLabel).toBe('Rename');

    await menu.press('ArrowDown');

    expect(menu.focusedLabel).toBe('Docs');

    menu.unmount();
  });

  it('steps from the menu itself onto the first item with ArrowDown and the last with ArrowUp, also after the pointer left', async () => {
    const menu = MenuDriver.mount({ parts: true });
    await menu.open();

    await menu.press('ArrowDown');
    expect(menu.focusedLabel).toBe('Rename');

    await menu.close();
    await menu.open();
    await menu.press('ArrowUp');
    expect(menu.focusedLabel).toBe('Delete');

    await menu.hover('Bold');
    await menu.leave();
    expect(menu.focusedLabel).toBe('menu');

    await menu.press('ArrowDown');
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

  it('renders a trailing slot after the label of an item', async () => {
    const menu = MenuDriver.mount({ parts: true });

    await menu.open();
    expect(menu.trailingOf('Docs')).toBe('✓');
    expect(menu.trailingOf('Rename')).toBe('');

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
