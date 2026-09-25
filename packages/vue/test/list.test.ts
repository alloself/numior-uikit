import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NuiListEntry } from '../src';
import { ListDriver } from './drivers/list';

const LANGUAGES: readonly NuiListEntry<string>[] = [
  { label: 'Go', value: 'go', description: 'Compiled' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby', disabled: true },
  { label: 'Котлин', value: 'kotlin' },
];

describe('NuiList', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a plain semantic list from parts with leading, description and trailing content', () => {
    const list = ListDriver.mount({
      parts: [
        { label: 'Alpha', description: 'First', leading: 'A' },
        { label: 'Beta', icon: 'check', trailing: 'New' },
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
      parts: [{ label: 'One' }],
    });

    expect(ordered.tag).toBe('ol');
    expect(ordered.hasModifier('variant-bordered')).toBe(true);
    expect(ordered.modifierOf('One', 'size-sm')).toBe(true);
    ordered.unmount();
  });

  it('turns parts with a destination or a click handler into links and buttons', async () => {
    const list = ListDriver.mount({
      parts: [
        { label: 'Docs', href: '/docs' },
        { label: 'Run', clickable: true },
        { label: 'Off', href: '/off', disabled: true },
        { label: 'Stop', clickable: true, disabled: true },
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
    const routed = ListDriver.mount({ parts: [{ label: 'Guide', to: '/guide' }], viaRouter: true });
    expect(routed.inner('Guide').attributes('href')).toBe('/router/guide');
    routed.unmount();
  });

  it('renders items data as parts, replaces bodies through the item slot and shows the empty state', async () => {
    let runs = 0;

    const list = ListDriver.mount({
      props: {
        items: [
          { label: 'Docs', href: '/docs' },
          {
            label: 'Run',
            onClick: () => {
              runs += 1;
            },
          },
          { label: 'Plain' },
        ],
      },
      itemSlot: ({ item }) => `${item.label}!`,
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
    await list.receiveItems([{ label: 'Back' }]);
    expect(list.titles).toEqual(['Back!']);
    list.unmount();
    const labelled = ListDriver.mount({ props: { items: [], emptyLabel: 'Пусто' } });
    expect(labelled.emptyText).toBe('Пусто');
    labelled.unmount();
  });

  it('renders groups with captions, nests their items and keeps option ids sequential', async () => {
    const list = ListDriver.mount({
      props: {
        items: [
          { label: 'Ссылки', items: [{ label: 'Документация', href: '/docs' }] },
          { label: 'Действия', items: [{ label: 'Выйти', onClick: () => {} }] },
        ],
      },
    });

    expect(list.groupLabels).toEqual(['Ссылки', 'Действия']);
    expect(list.groupAttr('Ссылки', 'role')).toBeUndefined();
    expect(list.titles).toEqual(['Документация', 'Выйти']);
    expect(list.innerTag('Документация')).toBe('a');
    list.unmount();

    const grouped = ListDriver.mount({
      props: {
        id: 'langs',
        selectable: 'single',
        items: [
          { label: 'Go', value: 'go' },
          {
            label: 'JVM',
            items: [
              { label: 'Kotlin', value: 'kotlin' },
              { label: 'Scala', value: 'scala' },
            ],
          },
        ],
      },
      modelValue: 'kotlin',
    });

    expect(grouped.groupAttr('JVM', 'role')).toBe('group');
    expect(grouped.optionIds).toEqual(['langs-option-0', 'langs-option-1', 'langs-option-2']);
    await grouped.focusItem('Kotlin');
    await grouped.press('ArrowUp');
    expect(grouped.focusedTitle).toBe('Go');
    await grouped.press('ArrowDown');
    await grouped.press('ArrowDown');
    expect(grouped.focusedTitle).toBe('Scala');
    grouped.unmount();
  });

  it('becomes a single-select listbox with one roving tab stop, arrows, typeahead and Enter', async () => {
    const list = ListDriver.mount({
      props: { items: LANGUAGES, selectable: 'single', label: 'Languages' },
      modelValue: 'rust',
    });

    expect(list.role).toBe('listbox');
    expect(list.listAttr('aria-label')).toBe('Languages');
    expect(list.listAttr('aria-multiselectable')).toBeUndefined();
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

    expect(list.listAttr('aria-multiselectable')).toBe('true');
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
      parts: [{ label: 'Docs', value: 'docs', href: '/docs' }, { label: 'Heading' }],
    });

    expect(list.item('Docs').attributes('role')).toBe('option');
    expect(list.innerTag('Docs')).toBe('div');
    expect(list.item('Heading').attributes('role')).toBeUndefined();
    expect(list.tabIndexes).toEqual([0, -1]);
    list.unmount();
  });
});
