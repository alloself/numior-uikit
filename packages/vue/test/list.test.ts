import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NuiListEntry } from '../src';
import { ListDriver } from './drivers/list';

const LANGUAGES: readonly NuiListEntry<string>[] = [
  { title: 'Go', value: 'go', description: 'Compiled' },
  { title: 'Rust', value: 'rust' },
  { title: 'Ruby', value: 'ruby', disabled: true },
  { title: 'Котлин', value: 'kotlin' },
];

describe('NuiList', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a plain semantic list from parts with leading, description and trailing content', () => {
    const list = ListDriver.mount({
      parts: [
        { title: 'Alpha', description: 'First', leading: 'A' },
        { title: 'Beta', icon: 'check', trailing: 'New' },
      ],
    });
    expect(list.tag).toBe('ul');
    expect(list.role).toBeUndefined();
    expect(list.hasModifier('variant-plain')).toBe(true);
    expect(list.hasModifier('size-md')).toBe(true);
    expect(list.titles).toEqual(['Alpha', 'Beta']);
    expect(list.descriptionOf('Alpha')).toBe('First');
    expect(list.innerTag('Alpha')).toBe('div');
    expect(list.modifierOf('Alpha', 'mode-plain')).toBe(true);
    expect(list.modifierOf('Beta', 'size-md')).toBe(true);
    expect(list.wrapper.find('.nui-row__trailing').text()).toBe('New');
    expect(list.wrapper.find('.nui-row__leading').text()).toBe('A');
    list.unmount();
    const ordered = ListDriver.mount({
      props: { as: 'ol', variant: 'bordered', size: 'sm' },
      parts: [{ title: 'One' }],
    });
    expect(ordered.tag).toBe('ol');
    expect(ordered.hasModifier('variant-bordered')).toBe(true);
    expect(ordered.modifierOf('One', 'size-sm')).toBe(true);
    ordered.unmount();
  });

  it('turns parts with a destination or a click handler into links and buttons', async () => {
    const list = ListDriver.mount({
      parts: [
        { title: 'Docs', href: '/docs' },
        { title: 'Run', clickable: true },
        { title: 'Off', href: '/off', disabled: true },
        { title: 'Stop', clickable: true, disabled: true },
      ],
    });
    expect(list.innerTag('Docs')).toBe('a');
    expect(list.inner('Docs').attributes('href')).toBe('/docs');
    expect(list.modifierOf('Docs', 'mode-link')).toBe(true);
    expect(list.innerTag('Run')).toBe('button');
    expect(list.inner('Run').attributes('type')).toBe('button');
    await list.clickInner('Run');
    expect(list.clicks).toBe(1);
    expect(list.inner('Off').attributes('aria-disabled')).toBe('true');
    expect(list.inner('Off').attributes('href')).toBeUndefined();
    expect(list.inner('Stop').attributes('disabled')).toBeDefined();
    expect(list.modifierOf('Stop', 'disabled')).toBe(true);
    list.unmount();
    const routed = ListDriver.mount({ parts: [{ title: 'Guide', to: '/guide' }], viaRouter: true });
    expect(routed.inner('Guide').attributes('href')).toBe('/router/guide');
    routed.unmount();
  });

  it('renders items data as parts, replaces bodies through the item slot and shows the empty state', async () => {
    let runs = 0;
    const list = ListDriver.mount({
      props: {
        items: [
          { title: 'Docs', href: '/docs' },
          {
            title: 'Run',
            onClick: () => {
              runs += 1;
            },
          },
          { title: 'Plain' },
        ],
      },
      itemSlot: ({ item }) => `${item.title}!`,
    });
    expect(list.titles).toEqual(['Docs!', 'Run!', 'Plain!']);
    expect(list.innerTag('Docs!')).toBe('a');
    expect(list.innerTag('Run!')).toBe('button');
    expect(list.innerTag('Plain!')).toBe('div');
    await list.clickInner('Run!');
    expect(runs).toBe(1);
    await list.receiveItems([]);
    expect(list.hasModifier('empty')).toBe(true);
    expect(list.emptyText).toBe('No items');
    await list.receiveItems([{ title: 'Back' }]);
    expect(list.titles).toEqual(['Back!']);
    list.unmount();
    const labelled = ListDriver.mount({ props: { items: [], emptyLabel: 'Пусто' } });
    expect(labelled.emptyText).toBe('Пусто');
    labelled.unmount();
  });

  it('becomes a single-select listbox with one roving tab stop, arrows, typeahead and Enter', async () => {
    const list = ListDriver.mount({
      props: { items: LANGUAGES, selectable: 'single', label: 'Languages' },
      modelValue: 'rust',
    });
    expect(list.role).toBe('listbox');
    expect(list.root.attributes('aria-label')).toBe('Languages');
    expect(list.root.attributes('aria-multiselectable')).toBeUndefined();
    expect(list.hasModifier('selectable')).toBe(true);
    expect(list.selectedTitles).toEqual(['Rust']);
    expect(list.tabIndexes).toEqual([-1, 0, -1, -1]);
    expect(list.modifierOf('Ruby', 'disabled')).toBe(true);
    expect(list.item('Ruby').attributes('aria-disabled')).toBe('true');
    await list.focusItem('Rust');
    await list.press('ArrowDown');
    expect(list.focusedTitle).toBe('Котлин');
    await list.press('ArrowDown');
    expect(list.focusedTitle).toBe('Go');
    await list.press('End');
    expect(list.focusedTitle).toBe('Котлин');
    await list.press('Home');
    expect(list.focusedTitle).toBe('Go');
    await list.press('к');
    expect(list.focusedTitle).toBe('Котлин');
    await list.press('Enter');
    expect(list.value).toBe('kotlin');
    expect(list.selectedTitles).toEqual(['Котлин']);
    expect(list.checkCount).toBe(1);
    await list.click('Go');
    expect(list.value).toBe('go');
    await list.focusItem('Котлин');
    await list.focusOutside();
    expect(list.tabIndexes).toEqual([0, -1, -1, -1]);
    list.unmount();
  });

  it('toggles values in multiple mode with Space and click while keeping the tab stop on a selected item', async () => {
    const list = ListDriver.mount({
      props: { items: LANGUAGES, selectable: 'multiple' },
      modelValue: ['rust'],
    });
    expect(list.root.attributes('aria-multiselectable')).toBe('true');
    await list.click('Go');
    expect(list.value).toEqual(['rust', 'go']);
    expect(list.selectedTitles).toEqual(['Go', 'Rust']);
    expect(list.checkCount).toBe(2);
    await list.focusItem('Rust');
    await list.press(' ');
    expect(list.value).toEqual(['go']);
    await list.click('Ruby');
    expect(list.value).toEqual(['go']);
    await list.focusOutside();
    expect(list.tabIndexes).toEqual([0, -1, -1, -1]);
    list.unmount();
  });

  it('keeps option semantics over links inside a selectable list and leaves value-less parts plain', () => {
    const list = ListDriver.mount({
      props: { selectable: 'single' },
      parts: [{ title: 'Docs', value: 'docs', href: '/docs' }, { title: 'Heading' }],
    });
    expect(list.item('Docs').attributes('role')).toBe('option');
    expect(list.innerTag('Docs')).toBe('div');
    expect(list.item('Heading').attributes('role')).toBeUndefined();
    expect(list.tabIndexes).toEqual([0, -1]);
    list.unmount();
  });
});
