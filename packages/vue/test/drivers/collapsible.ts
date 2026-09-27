import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiCollapsible, type NuiCollapsibleProps } from '../../src';
import { ComponentDriver } from './component';

export interface CollapsibleMountOptions {
  readonly props?: NuiCollapsibleProps;
  readonly open?: boolean;
  readonly content?: string;
  readonly trigger?: string;
}

export class CollapsibleDriver extends ComponentDriver {
  protected readonly block = 'nui-collapsible';

  private constructor(
    wrapper: VueWrapper,
    readonly open: Ref<boolean>,
  ) {
    super(wrapper);
  }

  static mount({
    props = {},
    open: initial = false,
    content = 'Details',
    trigger,
  }: CollapsibleMountOptions = {}) {
    const open = ref(initial);

    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiCollapsible,
          {
            ...props,
            open: open.value,
            'onUpdate:open': (value: boolean) => {
              open.value = value;
            },
          },
          trigger === undefined
            ? { default: () => content }
            : { default: () => content, trigger: () => trigger },
        ),
    });

    return new CollapsibleDriver(mount(Host), open);
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-collapsible');
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-collapsible--${modifier}`);
  }

  get trigger(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-collapsible__trigger');
  }

  get headingTag(): string {
    return this.wrapper.find('.nui-collapsible__heading').element.tagName.toLowerCase();
  }

  get expanded(): boolean {
    return this.trigger.attributes('aria-expanded') === 'true';
  }

  get controls(): string | undefined {
    return this.trigger.attributes('aria-controls');
  }

  get contentId(): string | undefined {
    return this.wrapper.find('.nui-collapsible__content').attributes('id');
  }

  get hiddenState(): string | undefined {
    return this.wrapper.find('.nui-collapsible__content').attributes('hidden');
  }

  get label(): string {
    return this.wrapper.find('.nui-collapsible__label').text();
  }

  get contentText(): string {
    return this.wrapper.find('.nui-collapsible__body').text();
  }

  async toggle(): Promise<void> {
    await this.trigger.trigger('click');
  }

  async settleCollapse(): Promise<void> {
    const event = new Event('transitionend', { bubbles: true });

    Object.defineProperty(event, 'propertyName', { value: 'grid-template-rows' });
    this.wrapper.find('.nui-collapsible__panel').element.dispatchEvent(event);
    await nextTick();
  }

  async matchInside(): Promise<void> {
    await this.wrapper.find('.nui-collapsible__content').trigger('beforematch');
  }

  async receive(open: boolean): Promise<void> {
    this.open.value = open;
    await nextTick();
  }
}
