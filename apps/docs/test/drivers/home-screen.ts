import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import HomeScreen from '../../.vitepress/theme/parts/HomeScreen.vue';
import { ru } from '../../.vitepress/theme/texts';
import { TopLayerStubs } from '../../../../packages/vue/test/support/top-layer';
import SampleButton from '../fixtures/SampleButton.vue';

const SCHEME_PREFIX = 'nui-theme--';

export class HomeScreenDriver {
  constructor(
    private readonly wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
  ) {}

  static mount(): HomeScreenDriver {
    const stubs = new TopLayerStubs();

    return new HomeScreenDriver(
      mount(HomeScreen, {
        props: { screen: SampleButton, texts: ru },
        attachTo: document.body,
      }),
      stubs,
    );
  }

  get screen(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`[role="region"][aria-label="${ru.homeScreen}"]`);
  }

  get accent(): string {
    return this.accentTrigger.text();
  }

  get direction(): string | undefined {
    return this.screen.attributes('dir');
  }

  get schemes(): string[] {
    return this.screen.classes().filter((name) => name.startsWith(SCHEME_PREFIX));
  }

  themeKey(name: string): string {
    return this.screen.element.style.getPropertyValue(name);
  }

  async choose(group: string, label: string): Promise<void> {
    const item = this.wrapper
      .find(`.nui-toggle-group[aria-label="${group}"]`)
      .findAll('button')
      .find(
        (candidate) => candidate.attributes('aria-label') === label || candidate.text() === label,
      );

    if (item === undefined) {
      throw new Error(`No option "${label}" in "${group}"`);
    }
    await item.trigger('click');
    await nextTick();
  }

  async pickAccent(label: string): Promise<void> {
    await this.accentTrigger.trigger('keydown', { key: 'ArrowDown' });
    await nextTick();

    const option = this.wrapper
      .findAll('[role="option"]')
      .find((candidate) => candidate.text() === label);

    if (option === undefined) {
      throw new Error(`No accent "${label}"`);
    }
    await option.trigger('click');
    await nextTick();
  }

  unmount(): void {
    this.stubs.restore();
    this.wrapper.unmount();
    document.documentElement.className = '';
  }

  private get accentTrigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>(`[role="combobox"][aria-label="${ru.accent}"]`);
  }
}
