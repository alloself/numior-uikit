import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiAccordionProps } from '../../src';
import { isString, listOf } from '../../../primitives/test/support/guards';
import AccordionScene from '../fixtures/AccordionScene.vue';
import type { SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface AccordionMountOptions {
  readonly props?: NuiAccordionProps;
  readonly modelValue?: SelectionValue;
}

const isStrings = listOf(isString);

export class AccordionDriver extends ComponentDriver {
  protected readonly block = 'nui-accordion';

  private constructor(
    private readonly scene: VueWrapper<InstanceType<typeof AccordionScene>>,
    private readonly multiple: boolean,
  ) {
    super(scene);
  }

  static mount({ props = {}, modelValue }: AccordionMountOptions = {}) {
    const scene = mount(AccordionScene, {
      props: {
        accordion: props,
        modelValue: typeof modelValue === 'string' ? modelValue : null,
        values: isStrings(modelValue) ? modelValue : [],
      },
      attachTo: document.body,
    });

    return new AccordionDriver(scene, props.multiple === true);
  }

  get selected(): SelectionValue {
    return this.multiple ? this.scene.vm.values : this.scene.vm.model;
  }

  get triggers(): DOMWrapper<HTMLButtonElement>[] {
    return this.wrapper.findAll<HTMLButtonElement>('.nui-collapsible__trigger');
  }

  get expandedLabels(): string[] {
    return this.triggers
      .filter((trigger) => trigger.attributes('aria-expanded') === 'true')
      .map((trigger) => trigger.text());
  }

  get headingTags(): string[] {
    return this.wrapper
      .findAll('.nui-collapsible__heading')
      .map((heading) => heading.element.tagName.toLowerCase());
  }

  get focusedLabel(): string | undefined {
    return this.triggers.find((trigger) => trigger.element === document.activeElement)?.text();
  }

  trigger(label: string): DOMWrapper<HTMLButtonElement> {
    const found = this.triggers.find((trigger) => trigger.text() === label);

    if (!found) {
      throw new Error(`No section labelled ${label}`);
    }
    return found;
  }

  async click(label: string): Promise<void> {
    await this.trigger(label).trigger('click');
  }

  async focus(label: string): Promise<void> {
    this.trigger(label).element.focus();
    await nextTick();
  }

  async press(key: string): Promise<void> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }
}
