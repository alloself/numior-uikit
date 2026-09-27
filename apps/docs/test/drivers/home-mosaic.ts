import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { homeOf } from '../../.vitepress/theme/home-content';
import DocsHomeMosaic from '../../.vitepress/theme/parts/DocsHomeMosaic.vue';

export class HomeMosaicDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(): HomeMosaicDriver {
    return new HomeMosaicDriver(
      mount(DocsHomeMosaic, {
        props: { content: homeOf('root').mosaic },
        attachTo: document.body,
      }),
    );
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  get nameInput(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input[type="text"]');
  }

  get nameLabel(): DOMWrapper<HTMLLabelElement> {
    return this.wrapper.find<HTMLLabelElement>('label');
  }

  get switchLabel(): string {
    return this.wrapper.find('[role="switch"]').element.closest('label')?.textContent?.trim() ?? '';
  }

  period(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('[role="radio"]')
      .find((item) => item.text() === label);

    if (!found) {
      throw new Error(`No period ${label}`);
    }
    return found;
  }

  get selectedPeriod(): string {
    return (
      this.wrapper
        .findAll<HTMLElement>('[role="radio"]')
        .find((item) => item.attributes('aria-checked') === 'true')
        ?.text() ?? ''
    );
  }

  async pickPeriod(label: string): Promise<void> {
    await this.period(label).trigger('click');
  }

  get progressValue(): number {
    return this.wrapper.find<HTMLProgressElement>('progress').element.value;
  }

  get chips(): string[] {
    return this.wrapper.findAll('.nui-chip').map((chip) => chip.text());
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
