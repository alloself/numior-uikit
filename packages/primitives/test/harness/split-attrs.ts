import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import SplitAttrsHost from '../fixtures/SplitAttrsHost.vue';

type HostWrapper = VueWrapper<InstanceType<typeof SplitAttrsHost>>;

export class SplitAttrsHarness {
  readonly focusCount = { value: 0 };
  private readonly wrapper: HostWrapper;

  constructor() {
    const focusCount = this.focusCount;

    this.wrapper = mount(SplitAttrsHost, {
      props: {
        placeholder: 'Name',
        onFocus: () => {
          focusCount.value += 1;
        },
      },
    });
  }

  get root(): DOMWrapper<HTMLDivElement> {
    return this.wrapper.find<HTMLDivElement>('div');
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  async focusControl(): Promise<void> {
    await this.control.trigger('focus');
  }

  async renamePlaceholder(next: string): Promise<void> {
    await this.wrapper.setProps({ placeholder: next });
  }
}
