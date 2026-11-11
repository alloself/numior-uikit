import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { applyCheck, checkStates } from '../src/tree/cascade';
import { defaultOptionKey } from '../src/shared/options';
import { TreeDriver } from './drivers/tree';
import {
  FILES,
  GUARDED,
  manyNodes,
  withDocs,
  withoutItems,
  withTrailing,
} from './support/tree-items';

describe('NuiTree', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a flat treeview with levels, set sizes, expansion state and deterministic ids', async () => {
    const tree = TreeDriver.mount({ props: { id: 'files', label: 'Файлы' }, expanded: ['src'] });
    expect(tree.tree.attributes('role')).toBe('tree');
    expect(tree.tree.attributes('tabindex')).toBe('0');
    expect(tree.tree.attributes('aria-label')).toBe('Файлы');
    expect(tree.tree.attributes('aria-multiselectable')).toBeUndefined();
    expect(tree.nodeTag('src')).toBe('li');
    expect(tree.listModifier('variant-plain')).toBe(true);
    expect(tree.modifierOf('src', 'mode-treeitem')).toBe(true);
    expect(tree.modifierOf('src', 'size-md')).toBe(true);
    expect(tree.modifierOf('legacy', 'disabled')).toBe(true);

    expect(tree.labels).toEqual([
      'src',
      'components',
      'index.ts',
      'docs',
      'README.md',
      'legacy',
      'empty',
      'Дизайн',
    ]);

    expect(tree.attr('components', 'aria-level')).toBe('2');
    expect(tree.attr('index.ts', 'aria-setsize')).toBe('2');
    expect(tree.attr('index.ts', 'aria-posinset')).toBe('2');
    expect(tree.hasDescription('index.ts')).toBe(true);
    expect(tree.attr('src', 'aria-expanded')).toBe('true');
    expect(tree.attr('components', 'aria-expanded')).toBe('false');
    expect(tree.attr('docs', 'aria-expanded')).toBe('false');
    expect(tree.attr('README.md', 'aria-expanded')).toBeUndefined();
    expect(tree.attr('empty', 'aria-expanded')).toBeUndefined();
    expect(tree.attr('legacy', 'aria-disabled')).toBe('true');
    expect(tree.nodeId('src')).toBe('files-node-src');
    expect(tree.hasPart('src', 'chevron')).toBe(true);
    expect(tree.hasPart('README.md', 'chevron')).toBe(false);
    expect(await tree.iconOf('src')).toBe('folder-open');
    expect(await tree.iconOf('components')).toBe('folder');
    expect(await tree.iconOf('README.md')).toBe('file');

    tree.unmount();
    const bare = TreeDriver.mount({ props: { icons: false } });
    expect(bare.hasPart('src', 'icon')).toBe(false);

    bare.unmount();
  });

  it('moves the active descendant with arrows, Home, End and PageDown while skipping disabled nodes', async () => {
    const tree = TreeDriver.mount({ modelValue: 'readme' });
    await tree.focus();
    expect(tree.activeLabel).toBe('README.md');

    await tree.press('Home');
    expect(tree.activeLabel).toBe('src');

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('docs');

    await tree.press('ArrowDown');
    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('empty');

    await tree.press('End');
    expect(tree.activeLabel).toBe('Дизайн');

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('Дизайн');

    await tree.press('PageUp');
    expect(tree.activeLabel).toBe('src');

    await tree.press('ArrowUp');
    expect(tree.activeLabel).toBe('src');

    tree.unmount();
    const looping = TreeDriver.mount({ props: { loop: true } });
    await looping.focus();
    expect(looping.activeLabel).toBe('src');

    await looping.press('ArrowUp');
    expect(looping.activeLabel).toBe('Дизайн');

    looping.unmount();
  });

  it('expands and collapses with the horizontal arrows and opens every sibling with the asterisk', async () => {
    const tree = TreeDriver.mount();
    await tree.focus();
    await tree.press('ArrowRight');
    expect(tree.expandedValues).toEqual(['src']);
    expect(tree.events).toEqual(['expand:src']);

    await tree.press('ArrowRight');
    expect(tree.activeLabel).toBe('components');

    await tree.press('ArrowLeft');
    expect(tree.activeLabel).toBe('src');

    await tree.press('ArrowLeft');
    expect(tree.expandedValues).toEqual([]);
    expect(tree.events).toEqual(['expand:src', 'collapse:src']);

    await tree.press('*');
    expect(tree.expandedValues).toEqual(['src', 'docs', 'design']);
    expect(tree.loads).toEqual(['docs']);
    expect(tree.labels).toContain('logo.svg');

    tree.unmount();
    const rtl = TreeDriver.mount({ dir: 'rtl' });
    await rtl.focus();
    await rtl.press('ArrowLeft');
    expect(rtl.expandedValues).toEqual(['src']);

    await rtl.press('ArrowRight');
    expect(rtl.expandedValues).toEqual([]);

    rtl.unmount();
  });

  it('steps into the first enabled child and stays on a node whose children are all disabled', async () => {
    const tree = TreeDriver.mount({ items: GUARDED, expanded: ['api', 'vault'] });
    await tree.focus();
    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('api');

    await tree.press('ArrowRight');
    expect(tree.activeLabel).toBe('stable');

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('vault');

    await tree.press('ArrowRight');
    expect(tree.activeLabel).toBe('vault');

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('outro');

    tree.unmount();
  });

  it('keeps moving from a node that became disabled instead of jumping to the start', async () => {
    const tree = TreeDriver.mount({ modelValue: 'readme' });
    await tree.focus();
    await tree.disable('README.md');
    expect(tree.activeLabel).toBe('README.md');

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('empty');

    await tree.disable('empty');
    await tree.press('ArrowUp');
    expect(tree.activeLabel).toBe('docs');

    await tree.disable('docs');
    await tree.press('PageDown');
    expect(tree.activeLabel).toBe('Дизайн');

    await tree.disable('Дизайн');
    await tree.press('PageUp');
    expect(tree.activeLabel).toBe('src');

    tree.unmount();
  });

  it('moves the cursor to the nearest visible ancestor when its node is collapsed from outside', async () => {
    const tree = TreeDriver.mount({ expanded: ['src', 'components'] });
    await tree.focus();
    await tree.press('ArrowDown');
    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('Button.vue');

    await tree.setExpanded(['src']);
    expect(tree.activeLabel).toBe('components');
    expect(tree.activeLabels).toEqual(['components']);

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('index.ts');

    await tree.setExpanded(['components']);
    expect(tree.activeLabel).toBe('src');
    expect(tree.activeLabels).toEqual(['src']);

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('docs');

    tree.unmount();
    const locked = TreeDriver.mount({ modelValue: 'readme', expanded: ['legacy'] });
    await locked.focus();
    await locked.press('ArrowDown');
    expect(locked.activeLabel).toBe('old.js');

    await locked.setExpanded([]);
    expect(locked.activeLabel).toBe('empty');

    locked.unmount();
  });

  it('moves the cursor to the node at the same position when its node disappears with a reload', async () => {
    const tree = TreeDriver.mount({ modelValue: 'readme' });
    await tree.focus();
    expect(tree.activeLabel).toBe('README.md');

    await tree.receiveItems(withoutItems('readme'));
    expect(tree.activeLabel).toBe('empty');
    expect(tree.activeLabels).toEqual(['empty']);

    await tree.press('ArrowUp');
    expect(tree.activeLabel).toBe('docs');

    await tree.press('End');
    expect(tree.activeLabel).toBe('Дизайн');

    await tree.receiveItems(withoutItems('readme', 'design'));
    expect(tree.activeLabel).toBe('empty');
    expect(tree.activeLabels).toEqual(['empty']);

    await tree.receiveItems([]);
    expect(tree.activeLabel).toBeUndefined();

    tree.unmount();

    const lazy = TreeDriver.mount({
      items: withDocs([
        { value: 'guide', label: 'guide.md' },
        { value: 'api', label: 'API.md' },
      ]),
      expanded: ['docs'],
    });

    await lazy.focus();
    await lazy.press('ArrowDown');
    await lazy.press('ArrowDown');
    expect(lazy.activeLabel).toBe('guide.md');

    await lazy.receiveItems(withDocs([{ value: 'api', label: 'API.md' }]));
    expect(lazy.activeLabel).toBe('API.md');

    await lazy.receiveItems(withDocs([]));
    expect(lazy.activeLabel).toBe('docs');

    lazy.unmount();
  });

  it('finds nodes by typeahead in Latin and Cyrillic and selects with Enter in single and multiple modes', async () => {
    const tree = TreeDriver.mount();
    await tree.focus();
    await tree.press('d');
    expect(tree.activeLabel).toBe('docs');

    await tree.advance(600);
    await tree.press('д');
    expect(tree.activeLabel).toBe('Дизайн');

    await tree.press('Enter');
    expect(tree.value).toBe('design');
    expect(tree.attr('Дизайн', 'aria-selected')).toBe('true');
    expect(tree.modifierOf('Дизайн', 'selected')).toBe(true);
    expect(tree.attr('src', 'aria-selected')).toBe('false');
    expect(tree.events).toEqual(['select:Дизайн']);

    tree.unmount();
    const multiple = TreeDriver.mount({ props: { selectable: 'multiple' }, modelValue: ['src'] });
    expect(multiple.tree.attributes('aria-multiselectable')).toBe('true');

    await multiple.focus();
    await multiple.press('End');
    await multiple.press('Enter');
    expect(multiple.value).toEqual(['src', 'design']);

    await multiple.press(' ');
    expect(multiple.value).toEqual(['src']);

    multiple.unmount();
    const passive = TreeDriver.mount({ props: { selectable: false } });
    expect(passive.attr('src', 'aria-selected')).toBeUndefined();

    await passive.focus();
    await passive.press('Enter');
    expect(passive.value).toBeNull();

    passive.unmount();
  });

  it('resets the typeahead buffer when the tree loses focus', async () => {
    const tree = TreeDriver.mount();
    await tree.focus();
    await tree.press('r');
    expect(tree.activeLabel).toBe('README.md');

    await tree.blur();
    await tree.focus();
    await tree.press('d');
    expect(tree.activeLabel).toBe('docs');

    tree.unmount();
  });

  it('matches typeahead against labels renamed in place', async () => {
    const tree = TreeDriver.mount();
    await tree.focus();
    await tree.press('r');
    expect(tree.activeLabel).toBe('README.md');

    await tree.advance(600);
    await tree.rename('docs', 'Заметки');
    await tree.press('з');
    expect(tree.activeLabel).toBe('Заметки');

    tree.unmount();
  });

  it('checks with a cascade through enabled descendants, selects checked rows and reports mixed ancestors', async () => {
    const tree = TreeDriver.mount({
      props: { checkable: true },
      expanded: ['src', 'components'],
    });

    expect(tree.hasModifier('checkable')).toBe(true);
    expect(tree.hasModifier('multiple')).toBe(true);
    expect(tree.tree.attributes('aria-multiselectable')).toBe('true');
    expect(tree.attr('src', 'aria-checked')).toBe('false');

    await tree.clickCheckbox('src');
    expect(tree.value).toEqual(['src', 'components', 'button', 'index']);
    expect(tree.attr('src', 'aria-checked')).toBe('true');
    expect(tree.attr('src', 'aria-selected')).toBe('true');
    expect(tree.modifierOf('src', 'selected')).toBe(true);
    expect(tree.events).toEqual(['select:src']);

    await tree.clickCheckbox('Button.vue');
    expect(tree.value).toEqual(['index']);
    expect(tree.attr('src', 'aria-checked')).toBe('mixed');
    expect(tree.attr('src', 'aria-selected')).toBe('false');
    expect(tree.hasPart('src', 'checkbox--indeterminate')).toBe(true);
    expect(tree.attr('components', 'aria-checked')).toBe('false');
    expect(tree.attr('index.ts', 'aria-checked')).toBe('true');

    await tree.click('Button.vue');
    expect(tree.value).toEqual(['src', 'components', 'button', 'index']);

    await tree.clickCheckbox('legacy');
    expect(tree.value).toEqual(['src', 'components', 'button', 'index']);

    await tree.focus();
    await tree.press('End');
    await tree.press(' ');
    expect(tree.value).toEqual(['src', 'components', 'button', 'index', 'design', 'logo']);

    await tree.press('Enter');
    expect(tree.value).toEqual(['src', 'components', 'button', 'index']);

    tree.unmount();
    const only = TreeDriver.mount({ props: { checkable: true, selectable: false } });
    await only.focus();
    await only.press('Enter');
    expect(only.value).toEqual(['src', 'components', 'button', 'index']);

    only.unmount();
  });

  it('checks lazily loaded children of a checked node and drops the spinner when the node collapses', async () => {
    const tree = TreeDriver.mount({ props: { checkable: true } });
    await tree.clickCheckbox('docs');
    expect(tree.value).toEqual(['docs']);

    await tree.clickToggle('docs');
    expect(tree.attr('docs', 'aria-busy')).toBe('true');

    await tree.receiveItems(
      withDocs([
        { value: 'guide', label: 'guide.md' },
        { value: 'api', label: 'API.md' },
      ]),
    );

    expect(tree.value).toEqual(['docs', 'guide', 'api']);
    expect(tree.attr('guide.md', 'aria-checked')).toBe('true');
    expect(tree.attr('docs', 'aria-busy')).toBeUndefined();

    tree.unmount();
    const failing = TreeDriver.mount();
    await failing.clickToggle('docs');
    expect(failing.loads).toEqual(['docs']);
    expect(failing.hasPart('docs', 'spinner')).toBe(true);

    await failing.setExpanded([]);
    expect(failing.hasPart('docs', 'spinner')).toBe(false);
    expect(failing.attr('docs', 'aria-busy')).toBeUndefined();

    await failing.clickToggle('docs');
    expect(failing.loads).toEqual(['docs', 'docs']);
    expect(failing.hasPart('docs', 'spinner')).toBe(true);

    failing.unmount();
  });

  it('shows the loading and empty rows in the configured language unless labelled', () => {
    const loading = TreeDriver.mount({ props: { loading: true }, config: { locale: 'ru-RU' } });
    expect(loading.tree.attributes('aria-busy')).toBe('true');
    expect(loading.statusText).toBe('Загрузка');

    loading.unmount();
    const empty = TreeDriver.mount({ items: [], config: { locale: 'ru-RU' } });
    expect(empty.emptyText).toBe('Список пуст');
    expect(empty.tree.attributes('role')).toBeUndefined();
    expect(empty.tree.attributes('tabindex')).toBeUndefined();
    expect(loading.tree.attributes('role')).toBe('tree');

    empty.unmount();
    const labelled = TreeDriver.mount({ items: [], props: { emptyLabel: 'Нет файлов' } });
    expect(labelled.emptyText).toBe('Нет файлов');

    labelled.unmount();
  });

  it('loads lazy children on expand, shows a spinner meanwhile and turns empty results into a leaf', async () => {
    const tree = TreeDriver.mount();
    await tree.clickToggle('docs');
    expect(tree.loads).toEqual(['docs']);
    expect(tree.attr('docs', 'aria-busy')).toBe('true');
    expect(tree.hasPart('docs', 'spinner')).toBe(true);
    expect(tree.value).toBeNull();

    await tree.receiveItems(withDocs([{ value: 'guide', label: 'guide.md' }]));
    expect(tree.labels).toContain('guide.md');
    expect(tree.attr('docs', 'aria-busy')).toBeUndefined();
    expect(tree.hasPart('docs', 'spinner')).toBe(false);

    await tree.receiveItems(withDocs([]));
    expect(tree.attr('docs', 'aria-expanded')).toBeUndefined();
    expect(tree.labels).not.toContain('guide.md');

    tree.unmount();
  });

  it('keeps a lazy node closed while its children load and opens it when they arrive', async () => {
    const tree = TreeDriver.mount();

    await tree.clickToggle('docs');
    expect(tree.expandedValues).toEqual(['docs']);
    expect(tree.isOpen('docs')).toBe(false);
    expect(tree.attr('docs', 'aria-expanded')).toBe('false');

    await tree.receiveItems(withDocs([{ value: 'guide', label: 'guide.md' }]));
    expect(tree.isOpen('docs')).toBe(true);
    expect(tree.attr('docs', 'aria-expanded')).toBe('true');

    tree.unmount();
    const waiting = TreeDriver.mount();

    await waiting.clickToggle('docs');
    await waiting.clickToggle('docs');
    expect(waiting.expandedValues).toEqual([]);
    expect(waiting.hasPart('docs', 'spinner')).toBe(false);

    waiting.unmount();
    const slotted = TreeDriver.mount({
      itemSlot: ({ item, expanded }) => `${item.label}:${expanded ? 'open' : 'closed'}`,
    });

    await slotted.clickToggle('docs:closed');
    expect(slotted.labels).toContain('docs:closed');

    await slotted.receiveItems(withDocs([{ value: 'guide', label: 'guide.md' }]));
    expect(slotted.labels).toContain('docs:open');

    slotted.unmount();
  });

  it('selects on click, toggles on the chevron and on double click and renders the item slot', async () => {
    const tree = TreeDriver.mount({
      itemSlot: ({ item, level }) => `${item.label}@${level}`,
    });

    expect(tree.labels[0]).toBe('src@1');

    await tree.clickToggle('src@1');
    expect(tree.expandedValues).toEqual(['src']);
    expect(tree.value).toBeNull();
    expect(tree.labels[1]).toBe('components@2');

    await tree.click('README.md@1');
    expect(tree.value).toBe('readme');
    expect(tree.activeLabel).toBe('README.md@1');

    await tree.dblclick('src@1');
    expect(tree.expandedValues).toEqual([]);

    await tree.click('legacy@1');
    expect(tree.value).toBe('readme');

    tree.unmount();
  });

  it('renders on the list shell with a variant, a size, badges, shortcuts and the current node', () => {
    const tree = TreeDriver.mount({
      items: withTrailing(),
      props: { variant: 'outline', size: 'sm' },
    });

    expect(tree.listModifier('variant-outline')).toBe(true);
    expect(tree.modifierOf('src', 'size-sm')).toBe(true);
    expect(tree.trailingOf('src')).toBe('3');
    expect(tree.trailingOf('docs')).not.toBe('');
    expect(tree.attr('README.md', 'aria-current')).toBe('true');
    expect(tree.modifierOf('README.md', 'current')).toBe(true);
    expect(tree.attr('src', 'aria-current')).toBeUndefined();

    tree.unmount();
  });

  it('rests the cursor on the selected node when focus arrives and forgets it on blur', async () => {
    const tree = TreeDriver.mount({ modelValue: 'readme' });
    expect(tree.activeLabel).toBeUndefined();
    expect(tree.activeLabels).toEqual([]);

    await tree.focus();
    expect(tree.activeLabel).toBe('README.md');
    expect(tree.activeLabels).toEqual(['README.md']);

    await tree.press('ArrowDown');
    expect(tree.activeLabel).toBe('empty');

    await tree.blur();
    expect(tree.activeLabel).toBeUndefined();
    expect(tree.activeLabels).toEqual([]);

    await tree.focus();
    expect(tree.activeLabel).toBe('README.md');

    tree.unmount();
  });

  it('moves the cursor to the pressed node before focus arrives and paints it only from the keyboard', async () => {
    const tree = TreeDriver.mount();
    await tree.pointerDown('docs');
    expect(tree.activeLabel).toBe('docs');
    expect(tree.activeLabels).toEqual([]);

    await tree.click('docs');
    expect(tree.value).toBe('docs');
    expect(tree.activeLabels).toEqual([]);

    await tree.press('ArrowDown');
    expect(tree.activeLabels).toEqual(['README.md']);

    await tree.pointerDown('src');
    expect(tree.activeLabel).toBe('src');
    expect(tree.activeLabels).toEqual([]);

    tree.unmount();
  });

  it('windows long trees, keeps the active row rendered and pages by the viewport', async () => {
    const tree = TreeDriver.mount({
      items: manyNodes(2000),
      props: { virtual: true, height: '160px', itemHeight: 32 },
    });

    expect(tree.hasModifier('virtual')).toBe(true);
    expect(tree.itemsTag).toBe('ul');

    await tree.setHeight(160);
    expect(tree.renderedCount).toBe(10);

    await tree.focus();
    await tree.press('End');
    expect(tree.activeLabel).toBe('Узел 1999');
    expect(tree.renderedCount).toBeLessThan(20);

    await tree.press('ArrowUp');
    expect(tree.activeLabel).toBe('Узел 1998');

    await tree.scrollTo(0);
    expect(tree.labels).toContain('Узел 1998');
    expect(tree.labels).toContain('Узел 0');

    await tree.press('Home');
    await tree.press('PageDown');
    expect(tree.activeLabel).toBe('Узел 5');

    tree.unmount();
  });

  it('keeps the window on a sticky list, reuses row elements and holds the active row element', async () => {
    const warn = vi.spyOn(console, 'warn');

    const tree = TreeDriver.mount({
      items: manyNodes(2000),
      props: { virtual: true, height: '160px', itemHeight: 32 },
    });

    await tree.setHeight(160);

    expect(tree.windowFrame).toEqual({
      lead: '0px',
      rest: '63680px',
      clampStart: '-160px',
      clampEnd: '-160px',
    });

    await tree.scrollTo(3200);

    expect(tree.windowFrame).toEqual({
      lead: '3072px',
      rest: '60480px',
      clampStart: '-288px',
      clampEnd: '-288px',
    });

    const before = tree.rowElements;

    await tree.scrollTo(3200 + 5 * 32);
    expect(tree.labels).toContain('Узел 105');
    expect(tree.rowElements.every((element) => before.includes(element))).toBe(true);

    await tree.focus();
    await tree.press('End');

    const active = tree.activeElement;

    expect(active?.textContent).toContain('Узел 1999');

    await tree.scrollTo(0);
    expect(tree.activeElement).toBe(active);

    expect(tree.windowFrame).toEqual({
      lead: '0px',
      rest: '63648px',
      clampStart: '-160px',
      clampEnd: '-192px',
    });

    await tree.scrollTo(40_000);
    expect(tree.activeElement).toBe(active);
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
    tree.unmount();
  });

  it('renders windowed rows instantly on scroll and fades in only rows revealed by expanding', async () => {
    const tree = TreeDriver.mount({
      items: manyNodes(2000),
      props: { virtual: true, height: '160px', itemHeight: 32 },
    });

    await tree.setHeight(160);
    await tree.scrollTo(3200);
    expect(tree.labels).toContain('Узел 100');
    expect(tree.labels.some((label) => tree.isRevealing(label))).toBe(false);

    await tree.clickToggle('Узел 100');
    expect(tree.isRevealing('Лист 100')).toBe(true);
    expect(tree.isRevealing('Узел 100')).toBe(false);

    await tree.advance(50);
    expect(tree.isRevealing('Лист 100')).toBe(false);

    tree.unmount();
  });
});

describe('tree cascade', () => {
  it('normalises ancestors bottom-up and ignores disabled subtrees', () => {
    const src = FILES[0];

    if (!src?.children?.[0]) {
      throw new Error('fixture changed');
    }

    const components = src.children[0];
    const checked = applyCheck(FILES, new Set(), components, defaultOptionKey);
    expect([...checked]).toEqual(['components', 'button']);

    const states = checkStates(FILES, checked, defaultOptionKey);

    expect([states.get('src'), states.get('components'), states.get('index')]).toEqual([
      'indeterminate',
      'checked',
      'unchecked',
    ]);

    const all = applyCheck(FILES, checked, src, defaultOptionKey);
    expect([...all].toSorted()).toEqual(['button', 'components', 'index', 'src']);

    const none = applyCheck(FILES, all, src, defaultOptionKey);
    expect(none.size).toBe(0);
  });
});
