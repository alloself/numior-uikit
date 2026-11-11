import { mount, type VueWrapper } from '@vue/test-utils';
import type { IconReference } from '../../.vitepress/reference/reference.types';
import IconTable from '../../.vitepress/theme/parts/IconTable.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';

export class IconTableDriver {
  private readonly clipboard = installClipboard();

  constructor(readonly wrapper: VueWrapper) {}

  static mount(icons: readonly IconReference[]): IconTableDriver {
    return new IconTableDriver(
      mount(IconTable, { props: { icons, texts: ru }, attachTo: document.body }),
    );
  }

  get copied(): readonly string[] {
    return this.clipboard.copies;
  }

  get names(): string[] {
    return this.wrapper
      .findAll('.nui-table__body [role="row"]')
      .map((row) => row.find('code').text());
  }

  get copyLabels(): string[] {
    return this.wrapper
      .findAll('.nui-table__body button')
      .map((button) => button.attributes('aria-label') ?? '');
  }

  async search(text: string): Promise<void> {
    await this.wrapper.find('input').setValue(text);
  }

  async copy(name: string): Promise<void> {
    const button = this.wrapper
      .findAll('.nui-table__body button')
      .find((candidate) => candidate.attributes('aria-label') === `${ru.iconCopy} ${name}`);

    if (button === undefined) {
      throw new Error(`No copy button for "${name}"`);
    }
    await button.trigger('click');
  }

  unmount(): void {
    this.wrapper.unmount();
    this.clipboard.restore();
  }
}
