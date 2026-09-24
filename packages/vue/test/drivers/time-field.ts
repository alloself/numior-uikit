import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiConfigProvider,
  NuiField,
  NuiTimeField,
  type NuiFieldProps,
  type NuiTimeFieldProps,
} from '../../src';
import { TopLayerStubs, dismissPopoverNatively, openPopoverNatively } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TimeFieldMountOptions {
  readonly props?: NuiTimeFieldProps;
  readonly modelValue?: string | null;
  readonly field?: NuiFieldProps;
  readonly locale?: string;
  readonly dir?: 'ltr' | 'rtl';
}

const isModel = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const normalize = (text: string): string => text.replace(/\s/gu, ' ').trim();

const labelOf = (element: Element): string =>
  normalize(element.querySelector('.nui-listbox__label')?.textContent ?? '');

export class TimeFieldDriver extends ComponentDriver {
  protected readonly block = 'nui-time-field';

  static mount({ props = {}, modelValue = null, field, locale, dir }: TimeFieldMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const model = ref<string | null>(modelValue);
    const localeRef = ref(locale);
    const control = () =>
      h(NuiTimeField, {
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          if (isModel(value)) {
            model.value = value;
          }
        },
      });
    const inField = () => (field ? h(NuiField, field, control) : control());
    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir }, [
          localeRef.value === undefined
            ? inField()
            : h(NuiConfigProvider, { locale: localeRef.value }, inField),
          h('button', { type: 'button', class: 'outside' }, 'Outside'),
        ]),
    });
    return new TimeFieldDriver(mount(Host, { attachTo: document.body }), stubs, model, localeRef);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly model: Ref<string | null>,
    private readonly localeRef: Ref<string | undefined>,
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-time-field').classes().includes(`nui-time-field--${modifier}`);
  }

  get segments(): DOMWrapper<HTMLInputElement>[] {
    return this.wrapper.findAll<HTMLInputElement>('.nui-time-field__segment');
  }

  get segmentTexts(): string[] {
    return this.segments.map((segment) => segment.element.value);
  }

  get segmentLabels(): string[] {
    return this.segments.map((segment) => segment.attributes('aria-label') ?? '');
  }

  get literals(): string[] {
    return this.wrapper
      .findAll('.nui-time-field__literal')
      .map((literal) => normalize(literal.text()));
  }

  get tabStops(): number[] {
    return this.segments.flatMap((segment, index) =>
      segment.attributes('tabindex') === '0' ? [index] : [],
    );
  }

  get group(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-time-field__segments');
  }

  get value(): string | null {
    return this.model.value;
  }

  get focusedSegment(): number {
    return this.segments.findIndex((segment) => segment.element === document.activeElement);
  }

  get hourId(): string | undefined {
    return this.wrapper.find('.nui-time-field__segment--type-hour').attributes('id');
  }

  get fieldLabelFor(): string | undefined {
    return this.wrapper.find('label').attributes('for');
  }

  get clockButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-time-field__clock');
  }

  get listbox(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('[role="listbox"]');
  }

  get expanded(): boolean {
    return this.clockButton.attributes('aria-expanded') === 'true';
  }

  get optionLabels(): string[] {
    return this.wrapper.findAll('[role="option"]').map((option) => labelOf(option.element));
  }

  get selectedLabels(): string[] {
    return this.wrapper
      .findAll('[role="option"][aria-selected="true"]')
      .map((option) => labelOf(option.element));
  }

  get emptyText(): string {
    return this.wrapper.find('.nui-listbox__empty').text();
  }

  get hiddenValue(): string | undefined {
    const hidden = this.wrapper.find<HTMLInputElement>('input[type="hidden"]');
    return hidden.exists() ? hidden.element.value : undefined;
  }

  async focusSegment(index: number): Promise<void> {
    this.segments[index]?.element.focus();
    await nextTick();
  }

  async insert(data: string): Promise<void> {
    const event = new InputEvent('beforeinput', {
      data,
      inputType: 'insertText',
      cancelable: true,
      bubbles: true,
    });
    document.activeElement?.dispatchEvent(event);
    await nextTick();
    await nextTick();
  }

  async typeText(text: string): Promise<void> {
    for (const char of text) {
      await this.insert(char);
    }
  }

  async press(key: string, init: KeyboardEventInit = {}): Promise<void> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
    await nextTick();
  }

  async clickClock(): Promise<void> {
    openPopoverNatively(this.listbox.element);
    await nextTick();
    await nextTick();
  }

  async dismissNatively(): Promise<void> {
    dismissPopoverNatively(this.listbox.element);
    await nextTick();
    await nextTick();
  }

  async clickOption(label: string): Promise<void> {
    const option = this.wrapper
      .findAll('[role="option"]')
      .find((candidate) => labelOf(candidate.element) === label);
    if (!option) {
      throw new Error(`No option labelled ${label}`);
    }
    await option.trigger('click');
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
    await nextTick();
  }

  async receiveModelValue(value: string | null): Promise<void> {
    this.model.value = value;
    await nextTick();
  }

  async setLocale(locale: string): Promise<void> {
    this.localeRef.value = locale;
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
