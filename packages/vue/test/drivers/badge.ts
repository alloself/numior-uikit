import { mount } from '@vue/test-utils';
import { NuiBadge, type NuiBadgeProps } from '../../src';
import { ComponentDriver } from './component';

export interface BadgeMountOptions {
  readonly props?: NuiBadgeProps;
  readonly label?: string | undefined;
}

export class BadgeDriver extends ComponentDriver {
  protected readonly block = 'nui-badge';

  static mount({ props = {}, label }: BadgeMountOptions = {}) {
    const slots = label === undefined ? {} : { default: label };
    return new BadgeDriver(mount(NuiBadge, { props, slots }));
  }

  get text(): string {
    return this.wrapper.text();
  }

  get hasIcon(): boolean {
    return this.wrapper.find('.nui-badge__icon').exists();
  }

  get hasLabel(): boolean {
    return this.wrapper.find('.nui-badge__label').exists();
  }
}
