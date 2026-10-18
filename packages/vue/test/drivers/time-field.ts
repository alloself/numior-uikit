import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import type { NuiFieldProps, NuiTimeFieldProps } from '../../src';
import TimeFieldScene from '../fixtures/TimeFieldScene.vue';
import { configPlugins } from '../support/config';
import { TopLayerStubs, dismissPopoverNatively, openPopoverNatively } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TimeFieldMountOptions {
  readonly props?: NuiTimeFieldProps;
  readonly modelValue?: string | null;
  readonly field?: NuiFieldProps;
  readonly locale?: string;
  readonly dir?: 'ltr' | 'rtl';
}

type TimeFieldSceneWrapper = VueWrapper<InstanceType<typeof TimeFieldScene>>;

const normalize = (text: string): string => text.replace(/\s/gu, ' ').trim();

const ROW = 36;

const stubWheelLayout = (wheel: HTMLElement): void => {
  const first = wheel.querySelector('.nui-time-field__wheel-item');
  const box = { top: wheel.scrollTop };

  if (first instanceof HTMLElement) {
    Object.defineProperty(first, 'offsetHeight', { value: ROW, configurable: true });
  }

  Object.defineProperty(wheel, 'scrollTop', {
    get: () => box.top,
    set: (value: number) => {
      box.top = value;
    },
    configurable: true,
  });
};

const selectedRow = (wheel: HTMLElement): number =>
  [...wheel.querySelectorAll('.nui-time-field__wheel-item')].findIndex((item) =>
    item.classList.contains('nui-time-field__wheel-item--selected'),
  );

const mousePointer = (type: string, clientY: number): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 3,
    pointerType: 'mouse',
    button: 0,
    clientY,
  });

export class TimeFieldDriver extends ComponentDriver {
  protected readonly block = 'nui-time-field';

  static mount({ props, modelValue, field, locale, dir }: TimeFieldMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const current = ref(locale);

    const wrapper = mount(TimeFieldScene, {
      props: { props, initialValue: modelValue, field, dir },
      attachTo: document.body,
      global: { plugins: configPlugins({ locale: () => current.value }) },
    });

    return new TimeFieldDriver(wrapper, stubs, current);
  }

  private constructor(
    private readonly scene: TimeFieldSceneWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly locale: Ref<string | undefined>,
  ) {
    super(scene);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-time-field').classes().includes(`nui-time-field--${modifier}`);
  }

  get segments(): DOMWrapper<HTMLInputElement>[] {
    return this.wrapper.findAll<HTMLInputElement>('.nui-time-field__segment');
  }

  get enterHints(): string[] {
    return this.segments.map((segment) => segment.attributes('enterkeyhint') ?? '');
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
    return this.scene.vm.model;
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

  get panel(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-time-field__panel');
  }

  get expanded(): boolean {
    return this.clockButton.attributes('aria-expanded') === 'true';
  }

  private get wheels(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('.nui-time-field__wheel');
  }

  private wheel(label: string): DOMWrapper<HTMLElement> {
    const found = this.wheels.find((wheel) => wheel.attributes('aria-label') === label);

    if (!found) {
      throw new Error(`No wheel labelled ${label}`);
    }
    return found;
  }

  get wheelLabels(): string[] {
    return this.wheels.map((wheel) => wheel.attributes('aria-label') ?? '');
  }

  wheelTexts(label: string): string[] {
    return this.wheel(label)
      .findAll('.nui-time-field__wheel-item')
      .map((item) => normalize(item.text()));
  }

  dimmedOn(label: string): string[] {
    return this.wheel(label)
      .findAll('.nui-time-field__wheel-item--disabled')
      .map((item) => normalize(item.text()));
  }

  wheelValue(label: string): string | undefined {
    return this.wheel(label).attributes('aria-valuetext');
  }

  get focusedWheel(): string | undefined {
    const focused = document.activeElement;

    return focused instanceof HTMLElement && focused.classList.contains('nui-time-field__wheel')
      ? (focused.getAttribute('aria-label') ?? undefined)
      : undefined;
  }

  get emptyText(): string {
    return this.wrapper.find('.nui-time-field__empty').text();
  }

  wheelRow(label: string): number {
    return Math.round(this.wheel(label).element.scrollTop / ROW);
  }

  async scrollWheel(label: string, rows: number): Promise<void> {
    const wheel = this.wheel(label).element;

    stubWheelLayout(wheel);
    wheel.scrollTop = (selectedRow(wheel) + rows) * ROW;
    wheel.dispatchEvent(new Event('scroll'));
    wheel.dispatchEvent(new Event('scrollend'));
    await nextTick();
  }

  async finishScroll(label: string): Promise<void> {
    this.wheel(label).element.dispatchEvent(new Event('scrollend'));
    await nextTick();
  }

  async dragWheel(label: string, distance: number): Promise<void> {
    const wheel = this.wheel(label).element;

    stubWheelLayout(wheel);
    wheel.scrollTop = selectedRow(wheel) * ROW;
    wheel.dispatchEvent(mousePointer('pointerdown', 100));
    window.dispatchEvent(mousePointer('pointermove', 101));
    window.dispatchEvent(mousePointer('pointermove', 100 + distance));
    window.dispatchEvent(mousePointer('pointerup', 100 + distance));

    wheel
      .querySelector('.nui-time-field__wheel-item')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await nextTick();
  }

  get hiddenValue(): string | undefined {
    const hidden = this.wrapper.find<HTMLInputElement>('input[type="hidden"]');
    return hidden.exists() ? hidden.element.value : undefined;
  }

  async clickField(): Promise<void> {
    this.wrapper
      .find('.nui-time-field')
      .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

    await nextTick();
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
  }

  async clickClock(): Promise<void> {
    openPopoverNatively(this.panel.element);
    await nextTick();
  }

  async dismissNatively(): Promise<void> {
    dismissPopoverNatively(this.panel.element);
    await nextTick();
  }

  async pickOnWheel(label: string, text: string): Promise<void> {
    const item = this.wheel(label)
      .findAll<HTMLElement>('.nui-time-field__wheel-item')
      .find((candidate) => normalize(candidate.text()) === text);

    if (!item) {
      throw new Error(`No ${text} on the ${label} wheel`);
    }
    item.element.click();
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async receiveModelValue(value: string | null): Promise<void> {
    this.scene.vm.model = value;
    await nextTick();
  }

  async setLocale(locale: string): Promise<void> {
    this.locale.value = locale;
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
