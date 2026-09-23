import { mount } from '@vue/test-utils';
import { NuiProgress, type NuiProgressProps } from '../../src';
import { ComponentDriver } from './component';

export class ProgressDriver extends ComponentDriver {
  protected readonly block = 'nui-progress';

  static mount(props: NuiProgressProps = {}) {
    return new ProgressDriver(mount(NuiProgress, { props }));
  }

  get element(): HTMLProgressElement {
    return this.wrapper.find<HTMLProgressElement>('progress').element;
  }

  get valueAttribute(): string | undefined {
    return this.attribute('value');
  }

  get maxAttribute(): string | undefined {
    return this.attribute('max');
  }

  async receive(props: NuiProgressProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}
