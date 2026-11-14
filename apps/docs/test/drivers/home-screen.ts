import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import HomeScreen from '../../.vitepress/theme/parts/HomeScreen.vue';
import { ru } from '../../.vitepress/theme/texts';
import { TopLayerStubs } from '../../../../packages/vue/test/support/top-layer';

const SCREEN_SRC = '/blocks/view/AppShell';

const mountScreen = (src: string): VueWrapper =>
  mount(HomeScreen, {
    props: { src, height: 720, texts: ru },
    attachTo: document.body,
  });

export class HomeScreenDriver {
  constructor(
    private readonly wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
  ) {}

  static mount(): HomeScreenDriver {
    const stubs = new TopLayerStubs();
    const wrapper = mountScreen(SCREEN_SRC);
    const page = wrapper.find<HTMLIFrameElement>('iframe').element.contentDocument;

    page?.append(page.createElement('html'));

    return new HomeScreenDriver(wrapper, stubs);
  }

  static mountOnSite(siteClasses: string): HomeScreenDriver {
    const stubs = new TopLayerStubs();

    document.documentElement.className = siteClasses;

    return new HomeScreenDriver(mountScreen('about:blank'), stubs);
  }

  get screen(): DOMWrapper<HTMLIFrameElement> {
    return this.wrapper.find<HTMLIFrameElement>('iframe');
  }

  get accent(): string {
    return this.accentTrigger.text();
  }

  attribute(name: string): string | null {
    return this.screen.element.contentDocument?.documentElement?.getAttribute(name) ?? null;
  }

  get themeClasses(): string[] {
    const page = this.screen.element.contentDocument?.documentElement;

    return [...(page?.classList ?? [])].filter((name) => name.includes('-theme--'));
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
