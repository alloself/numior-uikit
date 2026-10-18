import { mount } from '@vue/test-utils';
import { h, type Component } from 'vue';
import { NuiButton, NuiIcon, type NuiButtonProps, type NuiConfigOptions } from '../../src';
import { configPlugins } from '../support/config';
import { RouterStub } from '../support/router-stub';
import { ComponentDriver } from './component';

export type ButtonContent = 'text' | 'icon' | 'icon-with-text' | 'none';

export interface ButtonMountOptions {
  readonly props?: NuiButtonProps;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
  readonly content?: ButtonContent;
  readonly onClick?: () => void;
  readonly attached?: boolean;
  readonly viaRouter?: boolean;
  readonly routerComponent?: Component;
  readonly config?: NuiConfigOptions;
}

const slotFor = (content: ButtonContent, label: string) => {
  if (content === 'text') {
    return label;
  }
  return () =>
    content === 'icon' ? [h(NuiIcon, { icon: 'x' })] : [h(NuiIcon, { icon: 'x' }), label];
};

export class ButtonDriver extends ComponentDriver {
  protected readonly block = 'nui-button';

  static mount({
    props = {},
    attrs = {},
    label = 'Save',
    content = 'text',
    onClick,
    attached = false,
    viaRouter = false,
    routerComponent,
    config,
  }: ButtonMountOptions = {}) {
    return new ButtonDriver(
      mount(NuiButton, {
        props: viaRouter ? { ...props, as: RouterStub } : props,
        attrs: onClick ? { ...attrs, onClick } : attrs,
        slots: content === 'none' ? {} : { default: slotFor(content, label) },
        global: {
          plugins: configPlugins(config),
          components: routerComponent ? { RouterLink: routerComponent } : {},
        },
        ...(attached ? { attachTo: document.body } : {}),
      }),
    );
  }

  get element(): HTMLButtonElement {
    return this.wrapper.find<HTMLButtonElement>('button').element;
  }

  get node(): HTMLElement {
    return this.wrapper.find<HTMLElement>('.nui-button').element;
  }

  get iconAliases(): unknown[] {
    return this.wrapper.findAllComponents(NuiIcon).map((icon) => icon.props('icon'));
  }

  get tag(): string {
    return this.node.tagName.toLowerCase();
  }

  get href(): string | undefined {
    return this.attribute('href');
  }

  get type(): string | undefined {
    return this.attribute('type');
  }

  get busy(): boolean {
    return this.attribute('aria-busy') === 'true';
  }

  get disabled(): boolean {
    return this.element.disabled;
  }

  get ariaDisabled(): string | undefined {
    return this.attribute('aria-disabled');
  }

  get focused(): boolean {
    return document.activeElement === this.node;
  }

  get text(): string {
    return this.wrapper.find('.nui-button__content').text();
  }

  get showsSpinner(): boolean {
    return this.wrapper.find('.nui-button__spinner').exists();
  }

  async click(): Promise<void> {
    await this.wrapper.trigger('click');
  }

  clickNatively(): boolean {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    this.node.dispatchEvent(event);
    return event.defaultPrevented;
  }

  focus(): void {
    this.node.focus();
  }

  async update(props: NuiButtonProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}
