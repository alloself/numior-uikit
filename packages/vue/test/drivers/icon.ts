import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { NuiIcon, type IconRegistry, type NuiIconProps } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface IconMountOptions {
  readonly icons?: IconRegistry;
  readonly attrs?: Record<string, unknown>;
  readonly expectGlyph?: boolean;
}

const GLYPH = '.nui-icon__glyph';

export const waitForGlyph = async (wrapper: VueWrapper, selector = GLYPH): Promise<void> => {
  await vi.waitFor(() => {
    if (!wrapper.find(selector).exists()) {
      throw new Error(`Glyph ${selector} is still loading`);
    }
  });
};

export class IconDriver extends ComponentDriver {
  protected readonly block = 'nui-icon';

  static mount(
    props: NuiIconProps,
    { icons, attrs = {}, expectGlyph = true }: IconMountOptions = {},
  ) {
    const wrapper = mount(NuiIcon, {
      props,
      attrs,
      global: { plugins: configPlugins(icons === undefined ? undefined : { icons }) },
    });

    return new IconDriver(wrapper, expectGlyph);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly expectGlyph: boolean,
  ) {
    super(wrapper);
  }

  async ready(): Promise<void> {
    if (this.expectGlyph) {
      await waitForGlyph(this.wrapper);
    } else {
      await flushPromises();
    }
  }

  get decorative(): boolean {
    return this.wrapper.find('.nui-icon').attributes('aria-hidden') === 'true';
  }

  get glyphClasses(): string[] {
    return this.wrapper.find(GLYPH).classes();
  }

  get rotation(): string | undefined {
    return this.wrapper.find('.nui-icon').attributes('style');
  }

  async receive(props: Partial<NuiIconProps>): Promise<void> {
    await this.wrapper.setProps(props);
  }

  get empty(): boolean {
    return !this.wrapper.find(GLYPH).exists();
  }
}
