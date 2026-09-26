import { mount, type DOMWrapper } from '@vue/test-utils';
import { h } from 'vue';
import {
  NuiAvatar,
  NuiAvatarGroup,
  type NuiAvatarGroupProps,
  type NuiAvatarProps,
  type NuiConfigOptions,
} from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface AvatarMountOptions {
  readonly props?: NuiAvatarProps;
  readonly badge?: string | undefined;
  readonly config?: NuiConfigOptions;
}

export interface AvatarGroupMountOptions {
  readonly props?: NuiAvatarGroupProps;
  readonly children?: readonly NuiAvatarProps[];
}

const modifierOf = (wrapper: DOMWrapper<Element>, prefix: string): string =>
  wrapper.classes().find((name) => name.startsWith(`nui-avatar--${prefix}-`)) ?? '';

export class AvatarDriver extends ComponentDriver {
  protected readonly block = 'nui-avatar';

  static mount({ props = {}, badge, config }: AvatarMountOptions = {}) {
    const slots = badge === undefined ? {} : { badge };
    return new AvatarDriver(
      mount(NuiAvatar, { props, slots, global: { plugins: configPlugins(config) } }),
    );
  }

  get image(): DOMWrapper<HTMLImageElement> {
    return this.wrapper.find<HTMLImageElement>('.nui-avatar__image');
  }

  get initials(): string {
    const initials = this.wrapper.find('.nui-avatar__initials');
    return initials.exists() ? initials.text() : '';
  }

  get hasIcon(): boolean {
    return this.wrapper.find('.nui-avatar__icon').exists();
  }

  get figure(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-avatar__figure');
  }

  get label(): string | undefined {
    return this.figure.attributes('aria-label');
  }

  get statusLabel(): string | undefined {
    const status = this.wrapper.find('.nui-avatar__status');
    return status.exists() ? status.attributes('aria-label') : undefined;
  }

  get hasBadge(): boolean {
    return this.wrapper.find('.nui-avatar__badge').exists();
  }

  async failImage(): Promise<void> {
    await this.image.trigger('error');
  }

  async receive(props: NuiAvatarProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}

export class AvatarGroupDriver extends ComponentDriver {
  protected readonly block = 'nui-avatar-group';

  static mount({ props = {}, children = [] }: AvatarGroupMountOptions = {}) {
    const slots =
      children.length === 0 ? {} : { default: () => children.map((child) => h(NuiAvatar, child)) };

    return new AvatarGroupDriver(mount(NuiAvatarGroup, { props, slots }));
  }

  get avatars(): DOMWrapper<Element>[] {
    return this.wrapper.findAll('.nui-avatar');
  }

  get overflowText(): string | undefined {
    const overflow = this.wrapper.find('.nui-avatar-group__overflow');
    return overflow.exists() ? overflow.text() : undefined;
  }

  get sizes(): string[] {
    return this.avatars.map((avatar) => modifierOf(avatar, 'size'));
  }

  get shapes(): string[] {
    return this.avatars.map((avatar) => modifierOf(avatar, 'shape'));
  }

  get grouped(): boolean {
    return this.avatars.every((avatar) => avatar.classes().includes('nui-avatar--grouped'));
  }
}
