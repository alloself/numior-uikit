import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { defineComponent, h, nextTick, ref, useTemplateRef, type Ref } from 'vue';
import { NuiField, NuiOtpField, type NuiFieldProps, type NuiOtpFieldProps } from '../../src';
import { ComponentDriver } from './component';
import { isString } from '../../../primitives/test/support/guards';

export interface OtpFieldMountOptions {
  readonly props?: NuiOtpFieldProps;
  readonly modelValue?: string;
  readonly attrs?: Record<string, unknown>;
  readonly field?: NuiFieldProps;
  readonly separator?: string;
}

export interface OtpNativeSelection {
  readonly start: number | null;
  readonly end: number | null;
}

const SLOT_WIDTH = 40;

const isEditable = (element: HTMLInputElement): boolean => !element.readOnly && !element.disabled;

const inputEvent = (type: 'beforeinput' | 'input', init: InputEventInit): InputEvent =>
  new InputEvent(type, { bubbles: true, cancelable: type === 'beforeinput', ...init });

const replaceSelection = (element: HTMLInputElement, text: string): void => {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const caret = start + text.length;

  element.value = element.value.slice(0, start) + text + element.value.slice(end);
  element.setSelectionRange(caret, caret);
};

const deleteSelection = (element: HTMLInputElement, backward: boolean): boolean => {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const collapsed = start === end;
  const from = collapsed && backward ? start - 1 : start;
  const to = collapsed && !backward ? end + 1 : end;

  if (from < 0 || to > element.value.length) {
    return false;
  }
  element.value = element.value.slice(0, from) + element.value.slice(to);
  element.setSelectionRange(from, from);
  return true;
};

const pasteEvent = (text: string): Event => {
  const event = new Event('paste', { bubbles: true, cancelable: true });

  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  return event;
};

const layoutSlots = (slots: readonly DOMWrapper<HTMLElement>[]): void => {
  slots.forEach((slot, index) => {
    const box = new DOMRect(index * SLOT_WIDTH, 0, SLOT_WIDTH, SLOT_WIDTH);

    Object.defineProperty(slot.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => box,
    });
  });
};

const centerOf = (index: number): number => index * SLOT_WIDTH + SLOT_WIDTH / 2;

const pointerDown = (index: number): PointerEvent =>
  new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    button: 0,
    pointerType: 'mouse',
    clientX: centerOf(index),
  });

const indexesOf = (slots: readonly DOMWrapper<HTMLElement>[], selector: string): number[] =>
  slots.flatMap((slot, index) => (slot.find(selector).exists() ? [index] : []));

export class OtpFieldDriver extends ComponentDriver {
  protected readonly block = 'nui-otp-field';

  static mount({
    props = {},
    modelValue = '',
    attrs = {},
    field,
    separator,
  }: OtpFieldMountOptions = {}) {
    const model = ref(modelValue);
    const completions: string[] = [];

    const Host = defineComponent({
      setup() {
        const control = useTemplateRef<InstanceType<typeof NuiOtpField>>('control');

        return { focusControl: () => control.value?.focus() };
      },
      render() {
        const control = h(
          NuiOtpField,
          {
            ...props,
            ...attrs,
            ref: 'control',
            modelValue: model.value,
            'onUpdate:modelValue': (value: unknown) => {
              if (isString(value)) {
                model.value = value;
              }
            },
            onComplete: (code: unknown) => {
              if (isString(code)) {
                completions.push(code);
              }
            },
          },
          separator === undefined ? {} : { separator: () => separator },
        );

        return field ? h(NuiField, field, () => control) : control;
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });

    return new OtpFieldDriver(wrapper, model, completions, () => wrapper.vm.focusControl());
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<string>,
    readonly completions: readonly string[],
    private readonly focusHandle: () => void,
  ) {
    super(wrapper);
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-otp-field__control');
  }

  private get slots(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('.nui-otp-field__slot');
  }

  get value(): string {
    return this.model.value;
  }

  get nativeValue(): string {
    return this.control.element.value;
  }

  get selection(): OtpNativeSelection {
    return { start: this.control.element.selectionStart, end: this.control.element.selectionEnd };
  }

  get focused(): boolean {
    return document.activeElement === this.control.element;
  }

  get slotTexts(): string[] {
    return this.slots.map((slot) => {
      const char = slot.find('.nui-otp-field__char');

      return char.exists() ? char.text() : '';
    });
  }

  get placeholders(): string[] {
    return this.slots.map((slot) => {
      const placeholder = slot.find('.nui-otp-field__placeholder');

      return placeholder.exists() ? placeholder.text() : '';
    });
  }

  get groupSizes(): number[] {
    return this.wrapper
      .findAll('.nui-otp-field__group')
      .map((group) => group.findAll('.nui-otp-field__slot').length);
  }

  get separators(): DOMWrapper<Element>[] {
    return this.wrapper.findAll('.nui-otp-field__separator');
  }

  get slotsHidden(): boolean {
    return this.wrapper.find('.nui-otp-field__slots').attributes('aria-hidden') === 'true';
  }

  get activeSlots(): number[] {
    return this.slots.flatMap((slot, index) =>
      slot.classes().includes('nui-otp-field__slot--active') ? [index] : [],
    );
  }

  get caretSlot(): number | undefined {
    return indexesOf(this.slots, '.nui-otp-field__caret')[0];
  }

  get dotSlots(): number[] {
    return indexesOf(this.slots, '.nui-otp-field__dot');
  }

  get revealedSlot(): number | undefined {
    const index = this.slots.findIndex((slot) =>
      slot.classes().includes('nui-otp-field__slot--revealed'),
    );

    return index === -1 ? undefined : index;
  }

  controlAttribute(name: string): string | undefined {
    return this.control.attributes(name);
  }

  async focus(): Promise<void> {
    this.control.element.focus();
    await nextTick();
  }

  async focusThroughHandle(): Promise<void> {
    this.focusHandle();
    await nextTick();
  }

  async blur(): Promise<void> {
    this.control.element.blur();
    await nextTick();
  }

  async type(text: string): Promise<void> {
    for (const char of text) {
      await this.key(char);
    }
  }

  private async key(char: string): Promise<void> {
    const element = this.control.element;
    const before = inputEvent('beforeinput', { inputType: 'insertText', data: char });

    if (isEditable(element) && element.dispatchEvent(before)) {
      replaceSelection(element, char);
      element.dispatchEvent(inputEvent('input', { inputType: 'insertText', data: char }));
    }
    await nextTick();
  }

  async deleteBackward(): Promise<void> {
    await this.remove(true);
  }

  async deleteForward(): Promise<void> {
    await this.remove(false);
  }

  private async remove(backward: boolean): Promise<void> {
    const element = this.control.element;
    const inputType = backward ? 'deleteContentBackward' : 'deleteContentForward';

    if (isEditable(element) && deleteSelection(element, backward)) {
      element.dispatchEvent(inputEvent('input', { inputType }));
    }
    await nextTick();
  }

  async press(key: string, init: KeyboardEventInit = {}): Promise<void> {
    this.control.element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );

    await nextTick();
  }

  private pointAt(index: number): void {
    const element = this.control.element;

    layoutSlots(this.slots);
    element.dispatchEvent(pointerDown(index));
    if (!this.focused) {
      element.focus();
    }
  }

  async pressSlot(index: number): Promise<void> {
    this.pointAt(index);
    await nextTick();
  }

  async cancelPress(index: number): Promise<void> {
    this.control.element.dispatchEvent(pointerDown(index));
    this.control.element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    await nextTick();
  }

  async clickSlot(index: number, detail = 1): Promise<void> {
    this.pointAt(index);

    this.control.element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail, clientX: centerOf(index) }),
    );

    await nextTick();
  }

  async paste(text: string): Promise<void> {
    const element = this.control.element;

    if (element.dispatchEvent(pasteEvent(text)) && isEditable(element)) {
      replaceSelection(element, text);
      element.dispatchEvent(inputEvent('input', { inputType: 'insertFromPaste', data: text }));
    }
    await nextTick();
  }

  async autofill(text: string): Promise<void> {
    const element = this.control.element;

    element.value = text;
    element.setSelectionRange(text.length, text.length);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
  }

  async compose(text: string): Promise<void> {
    const element = this.control.element;

    replaceSelection(element, text);

    element.dispatchEvent(
      inputEvent('input', { inputType: 'insertCompositionText', data: text, isComposing: true }),
    );

    element.dispatchEvent(new CompositionEvent('compositionend', { data: text, bubbles: true }));
    await nextTick();
  }

  async selectNatively(start: number, end: number): Promise<void> {
    this.control.element.setSelectionRange(start, end);
    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();
  }

  async receiveModelValue(value: string): Promise<void> {
    this.model.value = value;
    await nextTick();
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  async settle(): Promise<void> {
    await flushPromises();
  }
}
