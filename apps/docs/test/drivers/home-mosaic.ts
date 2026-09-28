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

  unmount(): void {
    this.wrapper.unmount();
  }
}
