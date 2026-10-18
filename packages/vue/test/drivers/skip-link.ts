import { mount, type VueWrapper } from '@vue/test-utils';
import type { NuiConfigOptions, NuiSkipLinkProps } from '../../src';
import SkipLinkScene from '../fixtures/SkipLinkScene.vue';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface SkipLinkMountOptions {
  readonly props?: Partial<NuiSkipLinkProps>;
  readonly config?: NuiConfigOptions;
  readonly withTarget?: boolean;
}

export class SkipLinkDriver extends ComponentDriver {
  protected readonly block = 'nui-skip-link';

  private constructor(wrapper: VueWrapper) {
    super(wrapper);
  }

  static mount({ props, config, withTarget }: SkipLinkMountOptions = {}) {
    return new SkipLinkDriver(
      mount(SkipLinkScene, {
        props: { props, withTarget },
        attachTo: document.body,
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  get link(): HTMLAnchorElement {
    return this.wrapper.find<HTMLAnchorElement>('.nui-skip-link').element;
  }

  get text(): string {
    return this.wrapper.find('.nui-skip-link').text();
  }

  get href(): string | undefined {
    return this.wrapper.find('.nui-skip-link').attributes('href');
  }

  get targetFocused(): boolean {
    return document.activeElement?.id === 'main';
  }

  get targetTabindex(): string | null {
    return document.getElementById('main')?.getAttribute('tabindex') ?? null;
  }

  activate(): boolean {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    this.link.dispatchEvent(event);
    return event.defaultPrevented;
  }
}
