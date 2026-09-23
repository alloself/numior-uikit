import { mount } from '@vue/test-utils';
import { NuiSkeleton, type NuiSkeletonProps } from '../../src';
import { ComponentDriver } from './component';

export class SkeletonDriver extends ComponentDriver {
  protected readonly block = 'nui-skeleton';

  static mount(props: NuiSkeletonProps = {}) {
    return new SkeletonDriver(mount(NuiSkeleton, { props }));
  }

  get lines(): number {
    return this.wrapper.findAll('.nui-skeleton__line').length;
  }

  get hidden(): boolean {
    return this.attribute('aria-hidden') === 'true';
  }

  get inlineStyle(): string {
    return this.attribute('style') ?? '';
  }
}
