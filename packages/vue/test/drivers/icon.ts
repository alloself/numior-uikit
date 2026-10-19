import { mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import {
  NuiIcon,
  iconAliases,
  type IconAlias,
  type IconRegistry,
  type NuiIconProps,
} from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface IconMountOptions {
  readonly icons?: IconRegistry;
  readonly attrs?: Record<string, unknown>;
}

const GLYPH = '.nui-icon__glyph';

const isKitAlias = (name: string): name is IconAlias => name in iconAliases;

export const kitAliases = (): IconAlias[] => Object.keys(iconAliases).filter(isKitAlias);

export const waitForGlyph = async (wrapper: VueWrapper, selector = GLYPH): Promise<void> => {
  await vi.waitFor(() => {
    if (!wrapper.find(selector).exists()) {
      throw new Error(`Glyph ${selector} is still loading`);
    }
  });
};

export class IconDriver extends ComponentDriver {
  protected readonly block = 'nui-icon';

  static mount(props: NuiIconProps, { icons, attrs = {} }: IconMountOptions = {}) {
    const wrapper = mount(NuiIcon, {
      props,
      attrs,
      global: { plugins: configPlugins(icons === undefined ? undefined : { icons }) },
    });

    return new IconDriver(wrapper);
  }

  async ready(): Promise<void> {
    await waitForGlyph(this.wrapper);
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
}
