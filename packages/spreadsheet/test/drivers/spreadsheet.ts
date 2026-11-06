import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { NuiSpreadsheet, type NuiSpreadsheetChange, type NuiSpreadsheetProps } from '../../src';

interface KeyOptions {
  readonly ctrl?: boolean | undefined;
  readonly shift?: boolean | undefined;
}

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
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        ctrlKey: options.ctrl ?? false,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

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
