import { flushPromises, type VueWrapper } from '@vue/test-utils';
import type { NuiContentTableRow } from '@numior/content';
import { NuiTable, NuiTablePeers, type NuiTableColumnDef, type NuiTablePeer } from '@numior/table';
import type { NuiMenuEntry } from '@numior/vue';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { EditorDriver } from './editor';

type TableValue = string | number | boolean | Date | null;

const SHOW_ATTEMPTS = 10;

const isRow = (value: unknown): value is NuiContentTableRow =>
  typeof value === 'object' && value !== null && 'id' in value && 'cells' in value;

const isColumn = (value: unknown): value is NuiTableColumnDef<NuiContentTableRow> =>
  typeof value === 'object' && value !== null && 'key' in value && 'label' in value;

const isMenu = (value: unknown): value is (scope: object) => readonly NuiMenuEntry[] =>
  typeof value === 'function';

const isSink = (value: unknown): value is { undo(): number } =>
  typeof value === 'object' &&
  value !== null &&
  'undo' in value &&
  typeof value.undo === 'function';

const isPeer = (value: unknown): value is NuiTablePeer =>
  typeof value === 'object' && value !== null && 'name' in value && 'cell' in value;

const cellName = ({ cell }: NuiTablePeer): string =>
  `${String(cell.from.row)}:${String(cell.from.col)}`;

const labelled = (entries: readonly NuiMenuEntry[], label: string): NuiMenuEntry | undefined =>
  entries.find((entry) => 'label' in entry && entry.label === label);

const textsOf = (elements: Iterable<Element>): readonly string[] =>
  [...elements].map((element) => element.textContent?.trim() ?? '');

export class EditorTableDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorTableDriver {
    return new EditorTableDriver(editor.vueWrapper);
  }

  private get table() {
    return this.wrapper.findComponent(NuiTable);
  }

  private get element(): Element {
    const element: unknown = this.table.element;

    if (!(element instanceof Element)) {
      throw new Error('The table is not drawn');
    }
    return element;
  }

  private get host(): Element {
    const element: unknown = this.wrapper.element;

    if (!(element instanceof Element)) {
      throw new Error('The editor is not drawn');
    }
    return element;
  }

  private prop(name: string): unknown {
    const props: object = this.table.props();

    return Reflect.get(props, name);
  }

  private rowAt(index: number): NuiContentTableRow {
    const rows: unknown = this.prop('rows');
    const row: unknown = Array.isArray(rows) ? rows[index] : undefined;

    if (!isRow(row)) {
      throw new Error(`No table row at ${String(index)}`);
    }
    return row;
  }

  private keyAt(index: number): string {
    const columns: unknown = this.prop('columns');
    const column: unknown = Array.isArray(columns) ? columns[index] : undefined;

    if (!isColumn(column)) {
      throw new Error(`No table column at ${String(index)}`);
    }
    return column.key;
  }

  private menu(prop: string, scope: object): readonly NuiMenuEntry[] {
    const build = this.prop(prop);

    return isMenu(build) ? build(scope) : [];
  }

  private async select(entries: readonly NuiMenuEntry[], label: string): Promise<void> {
    const entry = labelled(entries, label);

    if (entry === undefined || !('onSelect' in entry) || entry.onSelect === undefined) {
      throw new Error(`No menu entry reads ${label}`);
    }
    entry.onSelect();
    await nextTick();
  }

  async show(): Promise<void> {
    for (let attempt = 0; attempt < SHOW_ATTEMPTS && !this.table.exists(); attempt += 1) {
      await vi.dynamicImportSettled();
      await flushPromises();
    }
  }

  get heads(): readonly string[] {
    return textsOf(this.element.querySelectorAll('thead th')).filter((text) => text !== '');
  }

  get rows(): readonly string[] {
    return [...this.element.querySelectorAll('tbody tr')]
      .map((row) => textsOf(row.querySelectorAll('td')).join('|'))
      .filter((row) => row.replaceAll('|', '') !== '');
  }

  get rowCount(): number {
    const rows: unknown = this.prop('rows');

    return Array.isArray(rows) ? rows.length : 0;
  }

  get peerNames(): readonly string[] {
    return textsOf(this.element.querySelectorAll('.nui-table__pane--body .nui-table-peers__name'));
  }

  get peerCells(): readonly string[] {
    const peers: unknown = this.wrapper.findComponent(NuiTablePeers).props('peers');

    return Array.isArray(peers)
      ? peers.flatMap((peer: unknown) => (isPeer(peer) ? [`${peer.name} ${cellName(peer)}`] : []))
      : [];
  }

  async focusCell(text: string): Promise<void> {
    const cell = [...this.element.querySelectorAll<HTMLElement>('tbody td')].find(
      (candidate) => candidate.textContent.trim() === text,
    );

    if (cell === undefined) {
      throw new Error(`No table cell reads ${text}`);
    }
    cell.focus();
    await nextTick();
  }

  get actions(): readonly string[] {
    return textsOf(this.host.querySelectorAll('.nui-editor-table__actions button'));
  }

  async edit(row: number, column: number, value: TableValue): Promise<void> {
    const target = this.rowAt(row);
    const key = this.keyAt(column);

    this.table.vm.$emit('edit', {
      kind: 'edit',
      changes: [{ row: target, key, value, previous: null }],
    });

    await nextTick();
  }

  async undo(): Promise<number> {
    const commands: unknown = this.prop('commands');
    const count = isSink(commands) ? commands.undo() : 0;

    await nextTick();
    return count;
  }

  async reorder(row: number, to: number): Promise<void> {
    this.table.vm.$emit('reorder', { row: this.rowAt(row), from: row, to });
    await nextTick();
  }

  resize(column: number, width: number): void {
    this.table.vm.$emit('update:widths', { [this.keyAt(column)]: width });
  }

  async sortBy(column: number, direction: 'asc' | 'desc'): Promise<void> {
    this.table.vm.$emit('update:sort', [{ key: this.keyAt(column), direction }]);
    await nextTick();
  }

  async filterBy(column: number, value: string): Promise<void> {
    this.table.vm.$emit('update:filters', [
      { kind: 'text', key: this.keyAt(column), op: 'contains', value },
    ]);

    await nextTick();
  }

  async hideValues(column: number, values: readonly string[]): Promise<void> {
    this.table.vm.$emit('update:filters', [
      { kind: 'set', key: this.keyAt(column), values, exclude: true },
    ]);

    await nextTick();
  }

  async order(columns: readonly number[]): Promise<void> {
    this.table.vm.$emit(
      'update:columnOrder',
      columns.map((column) => this.keyAt(column)),
    );

    await nextTick();
  }

  columnEntries(column: number): readonly string[] {
    return this.columnMenuOf(column).flatMap((entry) => ('label' in entry ? [entry.label] : []));
  }

  private columnMenuOf(column: number): readonly NuiMenuEntry[] {
    const anchor = this.element.querySelectorAll('thead th')[column];

    return this.menu('columnMenu', {
      column: { key: this.keyAt(column), label: '' },
      anchor,
    });
  }

  async columnAction(column: number, label: string): Promise<void> {
    await this.select(this.columnMenuOf(column), label);
  }

  async retype(column: number, type: string): Promise<void> {
    const sub = this.columnMenuOf(column).find((entry) => entry.type === 'sub');
    const group = sub?.type === 'sub' ? sub.items[0] : undefined;

    if (group?.type !== 'radio-group') {
      throw new Error('The column menu has no type choice');
    }
    group.onChange(type);
    await nextTick();
  }

  async rowAction(row: number, label: string): Promise<void> {
    await this.select(this.menu('contextMenu', { row: this.rowAt(row), ranges: [] }), label);
  }

  async rename(column: number, name: string): Promise<void> {
    await this.columnAction(column, 'Rename');

    const input = document.querySelector('.nui-editor-table__rename input');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('No rename field');
    }
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form?.dispatchEvent(new Event('submit', { cancelable: true }));
    await nextTick();
  }

  async hover(): Promise<void> {
    this.element
      .querySelector('tbody td')
      ?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    await nextTick();
  }

  get checks(): readonly boolean[] {
    return [...this.element.querySelectorAll('tbody input[type="checkbox"]')].map(
      (input) => input instanceof HTMLInputElement && input.checked,
    );
  }

  async check(index: number): Promise<void> {
    const input = this.element.querySelectorAll('tbody input[type="checkbox"]')[index];

    if (!(input instanceof HTMLElement)) {
      throw new Error(`No checkbox at ${String(index)}`);
    }
    input.click();
    await nextTick();
  }

  async clickAction(label: string): Promise<void> {
    const button = [...this.host.querySelectorAll('.nui-editor-table__actions button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    );

    if (!(button instanceof HTMLElement)) {
      throw new Error(`No table action reads ${label}`);
    }
    button.click();
    await nextTick();
  }
}
