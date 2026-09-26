import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { NuiButton, NuiIcon, type NuiButtonProps } from '../../src';
import { ComponentDriver } from './component';

export type ButtonContent = 'text' | 'icon' | 'icon-with-text';

export interface ButtonMountOptions {
  readonly props?: NuiButtonProps;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
  readonly content?: ButtonContent;
  readonly onClick?: () => void;
  readonly attached?: boolean;
}

const slotFor = (content: ButtonContent, label: string) => {
  if (content === 'text') {
    return label;
  }
  return () =>
    content === 'icon' ? [h(NuiIcon, { alias: 'x' })] : [h(NuiIcon, { alias: 'x' }), label];
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
  }: ButtonMountOptions = {}) {
    return new ButtonDriver(
      mount(NuiButton, {
        props,
        attrs: onClick ? { ...attrs, onClick } : attrs,
        slots: { default: slotFor(content, label) },
        ...(attached ? { attachTo: document.body } : {}),
      }),
    );
  }

  get element(): HTMLButtonElement {
    return this.wrapper.find<HTMLButtonElement>('button').element;
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
    return document.activeElement === this.element;
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

    this.element.dispatchEvent(event);
    return event.defaultPrevented;
  }

  focus(): void {
    this.element.focus();
  }

  async update(props: NuiButtonProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}
