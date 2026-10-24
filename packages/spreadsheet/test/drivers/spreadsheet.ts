import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { NuiSpreadsheet, type NuiSpreadsheetProps } from '../../src';

const texts = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class SpreadsheetDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount(props: NuiSpreadsheetProps): SpreadsheetDriver {
    return new SpreadsheetDriver(mount(NuiSpreadsheet, { props, attachTo: document.body }));
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
    const line = this.wrapper
      .findAll('.nui-table__row--body')
      .find((item) => item.find('[role="rowheader"]').text() === String(row));

    return line?.find(`[aria-colindex="${String(col + 2)}"]`).text();
  }

  async show(props: Partial<NuiSpreadsheetProps>): Promise<void> {
    await this.wrapper.setProps(props);
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
