import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiCalendarProps, NuiCalendarValue } from '../../src';
import CalendarScene from '../fixtures/CalendarScene.vue';
import { ComponentDriver } from './component';

export interface CalendarMountOptions {
  readonly props?: NuiCalendarProps;
  readonly modelValue?: NuiCalendarValue;
  readonly month?: string;
  readonly dir?: 'ltr' | 'rtl';
  readonly actions?: string;
  readonly clock?: boolean;
}

export interface CellState {
  readonly start: boolean;
  readonly end: boolean;
  readonly middle: boolean;
  readonly preview: boolean;
}

const datetimeOf = (element: Element | null | undefined): string | undefined =>
  element?.querySelector('time')?.getAttribute('datetime') ?? undefined;

const pointer = (type: string): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse' });

export class CalendarDriver extends ComponentDriver {
  protected readonly block = 'nui-calendar';

  static mount({
    props = {},
    modelValue = null,
    month,
    dir,
    actions,
    clock = false,
  }: CalendarMountOptions = {}) {
    const scene = mount(CalendarScene, {
      props: {
        calendar: { locale: 'ru-RU', ...(clock ? {} : { today: '2026-09-24' }), ...props },
        modelValue,
        month,
        dir,
        actions,
      },
      attachTo: document.body,
    });

    return new CalendarDriver(scene);
  }

  private constructor(private readonly scene: VueWrapper<InstanceType<typeof CalendarScene>>) {
    super(scene);
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-calendar--${modifier}`);
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-calendar');
  }

  get value(): NuiCalendarValue {
    return this.scene.vm.model;
  }

  get monthValue(): string | undefined {
    return this.scene.vm.month;
  }

  get captions(): string[] {
    return this.wrapper.findAll('.nui-calendar__title').map((title) =>
      title
        .findAll('button')
        .map((button) => button.text())
        .join(' '),
    );
  }

  get weekdays(): string[] {
    return this.months[0]?.findAll('.nui-calendar__weekday').map((cell) => cell.text()) ?? [];
  }

  get weekNumbers(): string[] {
    return this.months[0]?.findAll('.nui-calendar__week').map((cell) => cell.text()) ?? [];
  }

  private get months(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('.nui-calendar__month');
  }

  private get dayButtons(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('.nui-calendar__day');
  }

  get days(): string[] {
    return this.dayButtons.flatMap((button) => datetimeOf(button.element) ?? []);
  }

  get rows(): number {
    return this.months[0]?.findAll('.nui-calendar__row').length ?? 0;
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  get tabStop(): string | undefined {
    return datetimeOf(this.dayButtons.find((button) => button.element.tabIndex === 0)?.element);
  }

  get focusedDate(): string | undefined {
    const active = document.activeElement;

    return active instanceof HTMLElement && active.classList.contains('nui-calendar__day')
      ? datetimeOf(active)
      : undefined;
  }

  get focusedOption(): string | undefined {
    const active = document.activeElement;

    return active instanceof HTMLElement && active.classList.contains('nui-calendar__option')
      ? datetimeOf(active)
      : undefined;
  }

  get selected(): string[] {
    return this.wrapper
      .findAll('.nui-calendar__cell[aria-selected="true"]')
      .flatMap((cell) => datetimeOf(cell.element) ?? []);
  }

  get view(): string {
    return ['days', 'months', 'years'].find((view) => this.hasModifier(`view-${view}`)) ?? '';
  }

  get options(): string[] {
    return this.wrapper.findAll('.nui-calendar__option').map((option) => option.text());
  }

  get pickerIds(): Array<string | undefined> {
    return this.wrapper.findAll('.nui-calendar__picker').map((picker) => picker.attributes('id'));
  }

  get titleControls(): Array<string | undefined> {
    return this.wrapper
      .findAll('.nui-calendar__title-button[aria-expanded="true"]')
      .map((button) => button.attributes('aria-controls'));
  }

  get presetLabels(): string[] {
    return this.wrapper.findAll('.nui-calendar__preset').map((preset) => preset.text());
  }

  navLabel(direction: 'previous' | 'next'): string | undefined {
    return this.wrapper.find(`.nui-calendar__nav--${direction}`).attributes('aria-label');
  }

  get todayButton(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-calendar__today');
  }

  get actionsText(): string {
    return this.wrapper.find('.nui-calendar__actions').text();
  }

  navHidden(direction: 'previous' | 'next', monthIndex = 0): boolean {
    return (
      this.months[monthIndex]
        ?.find(`.nui-calendar__nav--${direction}`)
        .classes()
        .includes('nui-calendar__nav--hidden') ?? false
    );
  }

  presetPressed(label: string): boolean {
    return (
      this.wrapper
        .findAll('.nui-calendar__preset')
        .find((preset) => preset.text() === label)
        ?.attributes('aria-pressed') === 'true'
    );
  }

  private day(date: string): DOMWrapper<HTMLElement> {
    const found = this.dayButtons.find((button) => datetimeOf(button.element) === date);

    if (!found) {
      throw new Error(`No day ${date} rendered`);
    }

    return found;
  }

  dayClasses(date: string): string[] {
    return this.day(date)
      .classes()
      .reduce<string[]>((found, name) => {
        if (name.startsWith('nui-calendar__day--')) {
          found.push(name.replace('nui-calendar__day--', ''));
        }
        return found;
      }, []);
  }

  dayAttr(date: string, name: string): string | undefined {
    return this.day(date).attributes(name);
  }

  cellState(date: string): CellState {
    const classes = this.day(date).element.closest('.nui-calendar__cell')?.classList;

    return {
      start: classes?.contains('nui-calendar__cell--range-start') ?? false,
      end: classes?.contains('nui-calendar__cell--range-end') ?? false,
      middle: classes?.contains('nui-calendar__cell--range-middle') ?? false,
      preview: classes?.contains('nui-calendar__cell--preview') ?? false,
    };
  }

  async focusDay(date: string): Promise<void> {
    this.day(date).element.focus();
    await nextTick();
  }

  async focusGrid(): Promise<void> {
    this.dayButtons.find((button) => button.element.tabIndex === 0)?.element.focus();
    await nextTick();
  }

  async press(key: string, shiftKey = false): Promise<void> {
    const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });

    (document.activeElement ?? document.body).dispatchEvent(event);
    await nextTick();
  }

  async clickDay(date: string): Promise<void> {
    const element = this.day(date).element;

    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointerup'));
    await this.day(date).trigger('click');
    await nextTick();
  }

  async hoverDay(date: string): Promise<void> {
    this.day(date).element.dispatchEvent(pointer('pointerenter'));
    await nextTick();
  }

  async dragDays(from: string, to: string): Promise<void> {
    this.day(from).element.dispatchEvent(pointer('pointerdown'));
    await nextTick();
    this.day(to).element.dispatchEvent(pointer('pointerenter'));
    await nextTick();
    this.day(to).element.dispatchEvent(pointer('pointerup'));
    await nextTick();
  }

  async clickNav(direction: 'previous' | 'next', monthIndex = 0): Promise<void> {
    await this.months[monthIndex]?.find(`.nui-calendar__nav--${direction}`).trigger('click');
    await nextTick();
  }

  async clickTitle(part: 'month' | 'year'): Promise<void> {
    await this.wrapper.find(`.nui-calendar__title-button--${part}`).trigger('click');
    await nextTick();
  }

  async clickOption(label: string): Promise<void> {
    const option = this.wrapper.findAll('.nui-calendar__option').find((el) => el.text() === label);

    if (!option) {
      throw new Error(`No option ${label}`);
    }

    await option.trigger('click');
    await nextTick();
  }

  async clickToday(): Promise<void> {
    await this.todayButton.trigger('click');
    await nextTick();
  }

  async clickPreset(label: string): Promise<void> {
    const preset = this.wrapper.findAll('.nui-calendar__preset').find((el) => el.text() === label);

    await preset?.trigger('click');
    await nextTick();
  }

  async focusOutside(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('.outside').element.focus();
    await nextTick();
  }

  async receive(value: NuiCalendarValue): Promise<void> {
    this.scene.vm.model = value;
    await nextTick();
  }
}
