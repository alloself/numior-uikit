import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { computed, nextTick, type ComputedRef } from 'vue';
import type { NuiCollapsibleProps } from '../../src';
import CollapsibleScene from '../fixtures/CollapsibleScene.vue';
import { ComponentDriver } from './component';

export interface CollapsibleMountOptions {
  readonly props?: NuiCollapsibleProps;
  readonly open?: boolean;
  readonly content?: string;
  readonly trigger?: string;
}

export class CollapsibleDriver extends ComponentDriver {
  protected readonly block = 'nui-collapsible';

  readonly open: ComputedRef<boolean>;

  private constructor(private readonly scene: VueWrapper<InstanceType<typeof CollapsibleScene>>) {
    super(scene);
    this.open = computed(() => scene.vm.open);
  }

  static mount({
    props = {},
    open = false,
    content = 'Details',
    trigger,
  }: CollapsibleMountOptions = {}) {
    return new CollapsibleDriver(
      mount(CollapsibleScene, { props: { collapsible: props, open, content, trigger } }),
    );
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
    this.scene.vm.open = open;
    await nextTick();
  }
}
