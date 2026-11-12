import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import DocsNav from '../../.vitepress/theme/parts/DocsNav.vue';
import type { DocsNavLink } from '../../.vitepress/theme/theme.types';

const ROW_HEIGHT = 32;
const MORE = 'Ещё';

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');

const indexOf = (element: HTMLElement): number =>
  [...(element.parentElement?.children ?? [])].indexOf(element);

export class DocsNavDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(items: readonly DocsNavLink[], fits: number): DocsNavDriver {
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        return this.tagName === 'LI' && indexOf(this) >= fits ? ROW_HEIGHT : 0;
      },
    });

    return new DocsNavDriver(
      mount(DocsNav, {
        props: { items, label: 'Основные разделы', moreLabel: MORE },
        attachTo: document.body,
      }),
    );
  }

  async measured(): Promise<void> {
    await nextTick();
  }

  get visible(): string[] {
    return this.wrapper.findAll('li:not([inert]) a').map((link) => link.text());
  }

  get current(): string[] {
    return this.wrapper.findAll('a[aria-current="page"]').map((link) => link.text());
  }

  get hasMore(): boolean {
    return this.wrapper.findAll('button').some((button) => button.text() === MORE);
  }

  get overflowed(): string[] {
    return [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent.trim(),
    );
  }

  async openMore(): Promise<void> {
    await this.wrapper
      .findAll('button')
      .find((button) => button.text() === MORE)
      ?.trigger('click');

    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();

    if (original === undefined) {
      return;
    }

    Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
  }
}
