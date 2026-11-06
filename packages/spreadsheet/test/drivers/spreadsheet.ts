import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { NuiSpreadsheet, type NuiSpreadsheetChange, type NuiSpreadsheetProps } from '../../src';

interface KeyOptions {
  readonly ctrl?: boolean | undefined;
  readonly shift?: boolean | undefined;
  readonly alt?: boolean | undefined;
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

const pointer = (type: string): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1 });

const toneOf = (classes: readonly string[], prefix: string): string =>
  classes.find((name) => name.startsWith(prefix))?.slice(prefix.length) ?? '';

const texts = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class SpreadsheetDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    readonly changes: readonly NuiSpreadsheetChange[],
  ) {}

  static mount(props: NuiSpreadsheetProps): SpreadsheetDriver {
    const changes: NuiSpreadsheetChange[] = [];

    const wrapper = mount(NuiSpreadsheet, {
      props: {
        ...props,
        onChange: (change: NuiSpreadsheetChange) => {
          changes.push(change);
        },
      },
      attachTo: document.body,
    });

    return new SpreadsheetDriver(wrapper, changes);
  }

  get rendered(): boolean {
    return this.wrapper.find('.nui-spreadsheet').exists();
  }

  get direction(): string | undefined {
    return this.wrapper.find('.nui-spreadsheet').attributes('dir');
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
    return this.wrapper
      .findAll('.nui-spreadsheet__ref')
      .map((frame) => toneOf(frame.classes(), 'nui-spreadsheet__ref--tone-'));
  }

  get paintedReferences(): string[] {
    return this.wrapper
      .findAll('.nui-spreadsheet__token')
      .map(
        (token) => `${token.text()} ${toneOf(token.classes(), 'nui-spreadsheet__token--tone-')}`,
      );
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

  async show(props: Partial<NuiSpreadsheetProps>): Promise<void> {
    await this.wrapper.setProps(props);
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
