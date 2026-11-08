import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import {
  NuiSpreadsheet,
  type NuiSpreadsheetChange,
  type NuiSpreadsheetProps,
  type NuiSpreadsheetSelection,
} from '../../src';
import { PivotPanelDriver } from './pivot-panel';

interface DrawingDrag {
  readonly x: number;
  readonly y: number;
  readonly shift?: boolean | undefined;
  readonly cancel?: boolean | undefined;
  readonly pointerType?: string | undefined;
}

interface KeyOptions {
  readonly ctrl?: boolean | undefined;
  readonly shift?: boolean | undefined;
  readonly alt?: boolean | undefined;
}

interface SpreadsheetMount extends NuiSpreadsheetProps {
  readonly sheet?: number;
  readonly selection?: NuiSpreadsheetSelection;
}

interface Mounted {
  wrapper: VueWrapper | undefined;
}

interface CellSpot {
  readonly row: number;
  readonly col: number;
}

const keydown = (target: Element, key: string, options: KeyOptions): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrl ?? false,
      shiftKey: options.shift ?? false,
      altKey: options.alt ?? false,
      bubbles: true,
      cancelable: true,
    }),
  );
};

const restore = (owner: object, name: string, own: PropertyDescriptor | undefined): void => {
  if (own === undefined) {
    Reflect.deleteProperty(owner, name);
  } else {
    Object.defineProperty(owner, name, own);
  }
};

const FAR_BOX = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 2000,
  bottom: 2000,
  width: 2000,
  height: 2000,
};

const pointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, ...init });

const toneOf = (classes: readonly string[], prefix: string): string =>
  classes.find((name) => name.startsWith(prefix))?.slice(prefix.length) ?? '';

const tokensIn = (scope: DOMWrapper<Element>): string[] =>
  scope
    .findAll('.nui-spreadsheet__token')
    .map((token) => `${token.text()} ${toneOf(token.classes(), 'nui-spreadsheet__token--tone-')}`);

const texts = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class SpreadsheetDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    readonly changes: readonly NuiSpreadsheetChange[],
  ) {}

  static mount(props: SpreadsheetMount): SpreadsheetDriver {
    const changes: NuiSpreadsheetChange[] = [];
    const mounted: Mounted = { wrapper: undefined };

    const wrapper = mount(NuiSpreadsheet, {
      props: {
        ...props,
        onChange: (change: NuiSpreadsheetChange) => {
          changes.push(change);
        },
        'onUpdate:sheet': (sheet: number): void => {
          void mounted.wrapper?.setProps({ sheet });
        },
      },
      attachTo: document.body,
    });

    mounted.wrapper = wrapper;

    return new SpreadsheetDriver(wrapper, changes);
  }

  get drawings(): string[] {
    return this.wrapper.findAll('.nui-spreadsheet__drawing').map((drawing) => {
      const kind = toneOf(drawing.classes(), 'nui-spreadsheet__drawing--kind-');
      const picture = drawing.find('img');
      const title = drawing.find('.nui-spreadsheet__chart-title');

      if (picture.exists()) {
        return `${kind}: ${picture.attributes('alt') ?? ''} ${picture.attributes('src') ?? ''}`;
      }
      return `${kind}: ${title.exists() ? title.text() : drawing.text()}`;
    });
  }

  drawingSize(index: number): string | undefined {
    const style = this.wrapper.findAll('.nui-spreadsheet__drawing')[index]?.attributes('style');
    const width = /inline-size: ([\d.]+)px/u.exec(style ?? '')?.[1];
    const height = /block-size: ([\d.]+)px/u.exec(style ?? '')?.[1];

    return width === undefined || height === undefined ? undefined : `${width}×${height}`;
  }

  get selectedDrawings(): number[] {
    return this.wrapper
      .findAll('.nui-spreadsheet__drawing')
      .reduce<number[]>((selected, drawing, index) => {
        if (drawing.classes('nui-spreadsheet__drawing--selected')) {
          selected.push(index);
        }
        return selected;
      }, []);
  }

  async clickDrawing(index: number): Promise<void> {
    await this.wrapper.findAll('.nui-spreadsheet__drawing')[index]?.trigger('click');
  }

  async dragDrawing(index: number, by: DrawingDrag): Promise<void> {
    await this.dragFrom(this.wrapper.findAll('.nui-spreadsheet__drawing')[index]?.element, by);
  }

  async dragHandle(grip: string, by: DrawingDrag): Promise<void> {
    await this.dragFrom(
      this.wrapper.find(
        `.nui-spreadsheet__drawing-frame--selected .nui-spreadsheet__handle--${grip}`,
      ).element,
      by,
    );
  }

  private async dragFrom(target: Element | undefined, by: DrawingDrag): Promise<void> {
    const root = this.wrapper.find('.nui-spreadsheet').element;
    const capture = Object.getOwnPropertyDescriptor(Element.prototype, 'setPointerCapture');
    const start = { clientX: 100, clientY: 100 };
    const box = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect');

    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      writable: true,
      value: () => undefined,
    });

    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      configurable: true,
      writable: true,
      value: () => FAR_BOX,
    });

    try {
      target?.dispatchEvent(
        pointer('pointerdown', {
          ...start,
          ...(by.pointerType === undefined ? {} : { pointerType: by.pointerType }),
        }),
      );

      root.dispatchEvent(
        pointer('pointermove', {
          clientX: start.clientX + by.x,
          clientY: start.clientY + by.y,
          shiftKey: by.shift ?? false,
        }),
      );

      root.dispatchEvent(pointer(by.cancel === true ? 'pointercancel' : 'pointerup'));
    } finally {
      restore(Element.prototype, 'setPointerCapture', capture);
      restore(Element.prototype, 'getBoundingClientRect', box);
    }
    await nextTick();
  }

  async pressCell(row: number, col: number): Promise<void> {
    this.cell(row, col)?.dispatchEvent(pointer('pointerdown'));
    await nextTick();
  }

  chartBars(index: number): number {
    return (
      this.wrapper.findAll('.nui-spreadsheet__drawing')[index]?.findAll('.nui-chart__bar').length ??
      0
    );
  }

  get rendered(): boolean {
    return this.wrapper.find('.nui-spreadsheet').exists();
  }

  get direction(): string | undefined {
    return this.wrapper.find('.nui-table').attributes('dir');
  }

  get bordered(): boolean {
    return this.wrapper.find('.nui-table').classes().includes('nui-table--bordered');
  }

  get label(): string | undefined {
    return this.wrapper.find('[role="grid"]').attributes('aria-label');
  }

  get columnLabels(): string[] {
    return texts(this.wrapper, '.nui-table__row--head [role="columnheader"]').slice(1, 6);
  }

  get rowLabels(): string[] {
    return texts(this.wrapper, '.nui-table__row--body [role="rowheader"]').slice(0, 5);
  }

  get frozenRows(): number {
    return this.wrapper.findAll('.nui-table__row--frozen').length;
  }

  get pinnedColumns(): number {
    return this.wrapper.findAll(
      '.nui-table__row--head .nui-table__cell--pin-start:not(.nui-table__cell--rowhead)',
    ).length;
  }

  columnWidths(count: number): number[] {
    return this.wrapper
      .find('colgroup')
      .findAll('col')
      .slice(1, count + 1)
      .map((col) =>
        col.element instanceof HTMLElement ? Number.parseFloat(col.element.style.inlineSize) : 0,
      );
  }

  text(row: number, col: number): string | undefined {
    return this.cell(row, col)?.textContent?.trim();
  }

  get editorText(): string | undefined {
    return this.editorField?.value;
  }

  get editorError(): string | undefined {
    const id =
      this.editorField?.getAttribute('aria-invalid') === 'true'
        ? this.editorField.getAttribute('aria-errormessage')
        : null;

    return id === null ? undefined : document.getElementById(id)?.textContent?.trim();
  }

  get editing(): boolean {
    return this.editorField !== null;
  }

  async focus(row: number, col: number): Promise<void> {
    this.cell(row, col)?.focus();
    await nextTick();
  }

  async press(key: string, options: KeyOptions = {}): Promise<void> {
    keydown(document.activeElement ?? document.body, key, options);
    await nextTick();
  }

  async type(text: string): Promise<void> {
    const field = this.editorField;

    if (field !== null) {
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  async enter(row: number, col: number, text: string): Promise<void> {
    await this.focus(row, col);
    await this.press('F2');
    await this.type(text);
    await this.press('Enter');
  }

  get hasFormulaBar(): boolean {
    return this.formulaField !== null;
  }

  get nameBox(): string | undefined {
    return this.nameField?.value;
  }

  get nameInvalid(): boolean {
    return this.nameField?.getAttribute('aria-invalid') === 'true';
  }

  get formula(): string | undefined {
    return this.formulaField?.value;
  }

  get formulaReadonly(): boolean {
    return this.formulaField?.readOnly ?? false;
  }

  get formulaFocused(): boolean {
    return this.formulaField !== null && document.activeElement === this.formulaField;
  }

  get barExpanded(): boolean {
    return this.expandButton?.getAttribute('aria-expanded') === 'true';
  }

  get announcement(): string {
    return this.wrapper.find('.nui-spreadsheet__hidden').text();
  }

  get focusedCell(): CellSpot | undefined {
    const cell = document.activeElement?.closest('[role="gridcell"]');
    const label = cell?.parentElement?.querySelector('[role="rowheader"]')?.textContent?.trim();
    const index = Number(cell?.getAttribute('aria-colindex'));

    return label === undefined || Number.isNaN(index)
      ? undefined
      : { row: Number(label), col: index - 2 };
  }

  get referenceFrames(): string[] {
    return this.wrapper.findAll('.nui-spreadsheet__ref').map((frame) => {
      const pane = frame.element.closest('.nui-table__pane');

      const name = pane === null ? '' : toneOf([...pane.classList], 'nui-table__pane--');

      return `${name} ${toneOf(frame.classes(), 'nui-spreadsheet__ref--tone-')}`;
    });
  }

  get frameGrips(): number {
    return this.wrapper.findAll('.nui-spreadsheet__ref .nui-spreadsheet__grip').length;
  }

  get paintedReferences(): string[] {
    return tokensIn(this.wrapper.find('.nui-spreadsheet__mirror'));
  }

  get cellReferences(): string[] {
    const editor = this.wrapper.find('.nui-spreadsheet__editor--painted');

    return editor.exists() ? tokensIn(editor) : [];
  }

  get caret(): number | undefined {
    const field = document.activeElement;

    return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? (field.selectionEnd ?? undefined)
      : undefined;
  }

  get rangedCells(): number {
    return this.wrapper.findAll('.nui-table__row--body .nui-table__cell--ranged').length;
  }

  async dragGrip(grip: string, from: CellSpot, to: CellSpot): Promise<void> {
    const handle = this.wrapper.find(`.nui-spreadsheet__grip--${grip}`);
    const root = this.wrapper.find('.nui-spreadsheet').element;
    const points = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');
    const capture = Object.getOwnPropertyDescriptor(Element.prototype, 'setPointerCapture');

    let target = this.cell(from.row, from.col);

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => (target === null ? [] : [target]),
    });

    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      writable: true,
      value: () => undefined,
    });

    try {
      handle.element.dispatchEvent(pointer('pointerdown'));
      target = this.cell(to.row, to.col);
      root.dispatchEvent(pointer('pointermove'));
      root.dispatchEvent(pointer('pointerup'));
    } finally {
      restore(document, 'elementsFromPoint', points);
      restore(Element.prototype, 'setPointerCapture', capture);
    }
    await nextTick();
  }

  get functions(): string[] {
    return texts(
      this.wrapper,
      '[role="listbox"][aria-label="Functions"] [role="option"] .nui-row__title',
    );
  }

  get functionSummaries(): string[] {
    return texts(
      this.wrapper,
      '[role="listbox"][aria-label="Functions"] [role="option"] .nui-row__description',
    );
  }

  get activeFunction(): string | undefined {
    const id = document.activeElement?.getAttribute('aria-activedescendant');

    return id === null || id === undefined
      ? undefined
      : document.getElementById(id)?.querySelector('.nui-row__title')?.textContent?.trim();
  }

  get hint(): string {
    return this.wrapper
      .findAll('[aria-label="Function arguments"] .nui-row__title span')
      .map((part) =>
        part.classes().includes('nui-spreadsheet__hint-part--current')
          ? `<${part.element.textContent ?? ''}>`
          : (part.element.textContent ?? ''),
      )
      .join('');
  }

  get hintSummary(): string {
    return this.wrapper.find('[aria-label="Function arguments"] .nui-row__description').text();
  }

  get hinted(): boolean {
    const id = document.activeElement?.getAttribute('aria-describedby');

    return id !== null && id !== undefined && document.getElementById(id) !== null;
  }

  async settle(): Promise<void> {
    await vi.dynamicImportSettled();
    await nextTick();
  }

  async focusFormula(): Promise<void> {
    this.formulaField?.focus();
    await nextTick();
  }

  async typeFormula(text: string): Promise<void> {
    const field = this.formulaField;

    if (field !== null) {
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  async pressInFormula(key: string, options: KeyOptions = {}): Promise<void> {
    if (this.formulaField !== null) {
      keydown(this.formulaField, key, options);
    }
    await nextTick();
  }

  async goTo(name: string): Promise<void> {
    const field = this.nameField;

    if (field !== null) {
      field.focus();
      field.value = name;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      keydown(field, 'Enter', {});
    }
    await nextTick();
  }

  async toggleBar(): Promise<void> {
    this.expandButton?.click();
    await nextTick();
  }

  private get nameField(): HTMLInputElement | null {
    const found = this.wrapper.find('.nui-spreadsheet__name');

    return found.exists() && found.element instanceof HTMLInputElement ? found.element : null;
  }

  private get formulaField(): HTMLTextAreaElement | null {
    const found = this.wrapper.find('.nui-spreadsheet__formula');

    return found.exists() && found.element instanceof HTMLTextAreaElement ? found.element : null;
  }

  private get expandButton(): HTMLElement | null {
    const found = this.wrapper.find('.nui-spreadsheet__bar button[aria-controls]');

    return found.exists() && found.element instanceof HTMLElement ? found.element : null;
  }

  private cell(row: number, col: number): HTMLElement | null {
    const line = this.wrapper
      .findAll('.nui-table__row--body')
      .find((item) => item.find('[role="rowheader"]').text() === String(row));

    return line?.element.querySelector<HTMLElement>(`[aria-colindex="${String(col + 2)}"]`) ?? null;
  }

  private get editorField(): HTMLInputElement | null {
    const found = this.wrapper.find('.nui-table__editor input');

    return found.exists() && found.element instanceof HTMLInputElement ? found.element : null;
  }

  get tabs(): string[] {
    return texts(this.wrapper, '[role="tab"]');
  }

  get selectedTab(): string {
    return this.wrapper.find('[role="tab"][aria-selected="true"]').text();
  }

  get renameError(): string {
    return this.wrapper.find('.nui-spreadsheet__rename .nui-field__error').text();
  }

  private tab(name: string): Element | undefined {
    return this.wrapper.findAll('[role="tab"]').find((tab) => tab.text() === name)?.element;
  }

  async chooseTab(name: string): Promise<void> {
    this.tab(name)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
  }

  get selection(): unknown {
    return this.wrapper.emitted('update:selection')?.at(-1)?.[0];
  }

  async select(selection: NuiSpreadsheetSelection): Promise<void> {
    await this.wrapper.setProps({ selection });
    await nextTick();
  }

  get fillHandleShown(): boolean {
    const handle = this.wrapper.find('.nui-spreadsheet__fill');

    return handle.exists() && handle.attributes('style')?.includes('display: none') !== true;
  }

  async fillToNeighbour(): Promise<void> {
    await this.wrapper.find('.nui-spreadsheet__fill-grip').trigger('dblclick');
  }

  get clipFrames(): number {
    return this.wrapper.findAll('.nui-spreadsheet__clip').length;
  }

  async paste(text: string): Promise<void> {
    const event = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
    });

    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  get cellMenuItems(): string[] {
    return [...document.querySelectorAll('.nui-table__cell-menu [role="menuitem"]')].map(
      (item) => item.textContent?.trim() ?? '',
    );
  }

  async openCellMenu(row: number, col: number): Promise<void> {
    this.cell(row, col)?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
    );

    await nextTick();
  }

  async chooseCellMenuItem(label: string): Promise<void> {
    [...document.querySelectorAll<HTMLElement>('.nui-table__cell-menu [role="menuitem"]')]
      .find((item) => item.textContent?.trim() === label)
      ?.click();

    await nextTick();
  }

  async insertChart(row: number, col: number, kind: string): Promise<void> {
    await this.openCellMenu(row, col);
    await this.chooseCellMenuItem('Insert chart');
    await this.chooseCellMenuItem(kind);
  }

  async insertChartOver(shown: CellSpot, scrollLeft: number, kind: string): Promise<void> {
    const points = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');
    const target = this.cell(shown.row, shown.col);

    this.wrapper.find('.nui-table__viewport').element.scrollLeft = scrollLeft;

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => (target === null ? [] : [target]),
    });

    try {
      await this.insertChart(shown.row, shown.col, kind);
    } finally {
      restore(document, 'elementsFromPoint', points);
    }
  }

  async insertPictureFile(row: number, col: number, file: File): Promise<void> {
    const chooseFile = function (this: HTMLInputElement): void {
      Object.defineProperty(this, 'files', { configurable: true, value: [file] });
      this.dispatchEvent(new Event('change'));
    };

    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(chooseFile);

    await this.openCellMenu(row, col);
    await this.chooseCellMenuItem('Insert picture…');
    click.mockRestore();
    await flushPromises();
  }

  async pasteImage(file: File, text = ''): Promise<void> {
    const event = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: { getData: () => text, files: [file] },
    });

    this.wrapper.find('.nui-table__viewport').element.dispatchEvent(event);
    await flushPromises();
  }

  get rulesOpen(): boolean {
    return this.wrapper.find('.nui-spreadsheet-rules').exists();
  }

  get ruleTexts(): string[] {
    return texts(this.wrapper, '.nui-spreadsheet-rules__description');
  }

  get ruleAreas(): string[] {
    return texts(this.wrapper, '.nui-spreadsheet-rules__area');
  }

  get rulesEmpty(): string | undefined {
    const empty = this.wrapper.find('.nui-spreadsheet-rules__empty');

    return empty.exists() ? empty.text() : undefined;
  }

  get rulesAnnouncement(): string {
    return this.wrapper.find('.nui-spreadsheet-rules__live').text();
  }

  get litFrames(): number {
    return this.wrapper.findAll('.nui-spreadsheet__lit').length;
  }

  get rulesLabel(): string | undefined {
    const dialog = this.rulesDialog;
    const id = dialog?.getAttribute('aria-labelledby');

    return id === null || id === undefined
      ? undefined
      : document.getElementById(id)?.textContent?.trim();
  }

  private get rulesDialog(): Element | null | undefined {
    return this.wrapper.find('.nui-spreadsheet-rules').element.closest('[role="dialog"]');
  }

  async dismissRules(): Promise<void> {
    const dialog = this.rulesDialog;

    if (dialog instanceof HTMLElement) {
      dialog.hidePopover();
    }
    await nextTick();
  }

  get focusInRules(): boolean {
    return this.wrapper.find('.nui-spreadsheet-rules').element.contains(document.activeElement);
  }

  async openRules(row: number, col: number): Promise<void> {
    await this.openCellMenu(row, col);
    await this.chooseCellMenuItem('Conditional formatting…');
    await nextTick();
  }

  async showOnlySelection(): Promise<void> {
    await this.wrapper.find('.nui-spreadsheet-rules input[role="switch"]').setValue(true);
  }

  async hoverRule(index: number): Promise<void> {
    await this.rule(index)?.trigger('pointerenter');
  }

  async leaveRule(index: number): Promise<void> {
    await this.rule(index)?.trigger('pointerleave');
  }

  async deleteRule(index: number): Promise<void> {
    await this.rule(index)
      ?.findAll('.nui-spreadsheet-rules__actions button')
      .at(-1)
      ?.trigger('click');

    await nextTick();
  }

  get ruleEditorTitle(): string | undefined {
    const title = this.wrapper.find('.nui-spreadsheet-rules__subtitle');

    return title.exists() ? title.text() : undefined;
  }

  get ruleFieldErrors(): string[] {
    return texts(this.wrapper, '.nui-spreadsheet-rules__editor .nui-field__error');
  }

  get focusedRuleField(): string | undefined {
    const field = document.activeElement;

    return field instanceof HTMLInputElement ? field.labels?.[0]?.textContent?.trim() : undefined;
  }

  get focusedRulesButton(): string | undefined {
    const button = document.activeElement;

    return button instanceof HTMLButtonElement
      ? (button.getAttribute('aria-label') ?? undefined)
      : undefined;
  }

  ruleField(label: string): string | undefined {
    return this.editorInput(label)?.value;
  }

  async addRule(): Promise<void> {
    await this.wrapper.findAll('.nui-spreadsheet-rules__add button').at(-1)?.trigger('click');
    await nextTick();
  }

  async editRule(index: number): Promise<void> {
    await this.rule(index)?.find('.nui-spreadsheet-rules__actions button').trigger('click');
    await nextTick();
  }

  async fillRuleField(label: string, value: string): Promise<void> {
    const input = this.editorInput(label);

    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  async chooseRuleOption(label: string, option: string): Promise<void> {
    await this.openRuleSelect(label);

    const entry = this.wrapper
      .findAll<HTMLElement>('.nui-spreadsheet-rules__editor [role="option"]')
      .find((each) => each.text() === option);

    if (!entry) {
      throw new Error(`No option ${option}`);
    }
    await entry.trigger('click');
    await nextTick();
  }

  async openRuleSelect(label: string): Promise<void> {
    const select = [
      ...document.querySelectorAll<HTMLElement>('.nui-spreadsheet-rules__editor [role="combobox"]'),
    ].find(
      (each) =>
        document.getElementById(each.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ===
        label,
    );

    if (select) {
      select.focus();
      keydown(select, 'ArrowDown', {});
    }
    await nextTick();
  }

  async saveRule(): Promise<void> {
    await this.wrapper.find('.nui-spreadsheet-rules__editor').trigger('submit');
    await nextTick();
  }

  private editorInput(label: string): HTMLInputElement | undefined {
    return [
      ...document.querySelectorAll<HTMLInputElement>('.nui-spreadsheet-rules__editor input'),
    ].find((input) => input.labels?.[0]?.textContent?.trim() === label);
  }

  async moveRuleDown(index: number): Promise<void> {
    const grip = this.rule(index)?.find('.nui-spreadsheet-rules__grip').element;

    if (grip instanceof HTMLElement) {
      grip.focus();
      keydown(grip, ' ', {});
      keydown(grip, 'ArrowDown', {});
      keydown(grip, ' ', {});
    }
    await nextTick();
  }

  async pressInRules(key: string): Promise<void> {
    keydown(document.activeElement ?? document.body, key, {});
    await nextTick();
  }

  async closeRules(): Promise<void> {
    await this.wrapper.find('.nui-spreadsheet-rules__header button').trigger('click');
    await nextTick();
  }

  private rule(index: number): DOMWrapper<Element> | undefined {
    return this.wrapper.findAll('.nui-spreadsheet-rules__rule')[index];
  }

  async addSheet(): Promise<void> {
    await this.wrapper.find('.nui-spreadsheet__tabs > button').trigger('click');
  }

  async renameTab(name: string, next: string): Promise<void> {
    this.tab(name)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();

    const field = this.wrapper.find('.nui-spreadsheet__rename input');

    await field.setValue(next);
    await this.wrapper.find('.nui-spreadsheet__rename').trigger('submit');
  }

  async show(props: Partial<SpreadsheetMount>): Promise<void> {
    await this.wrapper.setProps(props);
    await nextTick();
  }

  get reportTitle(): string | undefined {
    const alert = this.wrapper.find('.nui-alert:not(.nui-alert--closed)');

    return alert.exists() ? alert.find('.nui-alert__title').text() : undefined;
  }

  get reportTone(): string {
    return toneOf(this.wrapper.find('.nui-alert').classes(), 'nui-alert--tone-');
  }

  get reportStale(): string | undefined {
    const line = this.wrapper.find('.nui-spreadsheet__report-stale');

    return line.exists() ? line.text() : undefined;
  }

  get reportLines(): string[] {
    return texts(this.wrapper, '.nui-spreadsheet__report-list li');
  }

  async recalculateFromReport(): Promise<void> {
    await this.pressFocused('.nui-alert__actions button');
  }

  async dismissReport(): Promise<void> {
    await this.wrapper.find('.nui-alert__close').trigger('click');
  }

  get status(): string | undefined {
    const status = this.wrapper.find('.nui-spreadsheet__status--shown');

    return status.exists() ? status.find('.nui-spreadsheet__status-text').text() : undefined;
  }

  get statusAction(): string {
    return this.wrapper.find('.nui-spreadsheet__status button').text();
  }

  async pressStatusAction(): Promise<void> {
    await this.pressFocused('.nui-spreadsheet__status button');
  }

  private async pressFocused(selector: string): Promise<void> {
    const button = this.wrapper.find(selector);

    if (button.element instanceof HTMLElement) {
      button.element.focus();
    }
    await button.trigger('click');
  }

  stale(row: number, col: number): boolean {
    return this.cell(row, col)?.classList.contains('nui-spreadsheet__stale') === true;
  }

  get pivot(): PivotPanelDriver {
    return new PivotPanelDriver(this.wrapper);
  }

  async insertPivot(row: number, col: number): Promise<void> {
    await this.openCellMenu(row, col);
    await this.chooseCellMenuItem('Insert pivot table');
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
