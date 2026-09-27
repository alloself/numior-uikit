import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { NuiAccordion, NuiAccordionItem, type NuiAccordionProps } from '../../src';
import { createSelection, type Selection, type SelectionValue } from '../support/selection';
import { ComponentDriver } from './component';

export interface AccordionMountOptions {
  readonly props?: NuiAccordionProps;
  readonly modelValue?: SelectionValue;
}

const SECTIONS = [
  { value: 'install', label: 'Install' },
  { value: 'usage', label: 'Usage' },
  { value: 'api', label: 'API', disabled: true },
  { value: 'faq', label: 'FAQ' },
];

export class AccordionDriver extends ComponentDriver {
  protected readonly block = 'nui-accordion';

  private constructor(
    wrapper: VueWrapper,
    private readonly selection: Selection,
  ) {
    super(wrapper);
  }

  static mount({ props = {}, modelValue }: AccordionMountOptions = {}) {
    const selection = createSelection(modelValue, props.multiple === true);

    const Host = defineComponent({
      setup: () => () =>
        h(NuiAccordion, { ...props, ...selection.props() }, () =>
          SECTIONS.map((section) =>
            h(NuiAccordionItem, { key: section.value, ...section }, () => `${section.label} body`),
          ),
        ),
    });

    return new AccordionDriver(mount(Host, { attachTo: document.body }), selection);
  }

  get selected(): SelectionValue {
    return this.selection.value();
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
