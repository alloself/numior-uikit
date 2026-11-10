import { mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import { type ListFocusMode, type ListNavigation, type ListOrientation } from '../../src';
import ListNavigationHost from '../fixtures/ListNavigationHost.vue';

export interface ListHarnessOptions {
  readonly labels?: readonly string[];
  readonly disabled?: readonly number[];
  readonly role?: 'menuitem' | 'tab' | 'option';
  readonly mode?: ListFocusMode;
  readonly orientation?: ListOrientation;
  readonly dir?: 'ltr' | 'rtl';
  readonly loop?: boolean;
  readonly pageSize?: number;
}

type HostWrapper = VueWrapper<InstanceType<typeof ListNavigationHost>>;

const DEFAULT_LABELS = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date'];

export class ListHarness {
  static mount(options: ListHarnessOptions = {}): ListHarness {
    const wrapper = mount(ListNavigationHost, {
      props: { ...options, labels: options.labels ?? DEFAULT_LABELS },
      attachTo: document.body,
    });

    return new ListHarness(wrapper);
  }

  private constructor(private readonly wrapper: HostWrapper) {}

  get navigation(): ListNavigation {
    return this.wrapper.vm.navigation;
  }

  private get container(): HTMLElement {
    return this.wrapper.find<HTMLElement>('[role="listbox"]').element;
  }

  private get buttons(): HTMLElement[] {
    return this.wrapper.findAll<HTMLElement>('button').map((button) => button.element);
  }

  get activeText(): string | undefined {
    return this.navigation.activeElement()?.textContent ?? undefined;
  }

  get focusedText(): string | undefined {
    const focused = document.activeElement;
    return focused instanceof HTMLButtonElement ? (focused.textContent ?? undefined) : undefined;
  }

  get tabIndexes(): number[] {
    return this.buttons.map((button) => button.tabIndex);
  }

  get activeDescendant(): string | undefined {
    return this.navigation.activeId.value;
  }

  get query(): string {
    return this.navigation.typeaheadQuery.value;
  }

  press(key: string): boolean {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    this.container.dispatchEvent(event);
    return event.defaultPrevented;
  }

  type(text: string): void {
    for (const char of text) {
      this.press(char);
    }
  }

  focusItem(index: number): void {
    this.buttons[index]?.focus();
  }

  advance(ms: number): void {
    vi.advanceTimersByTime(ms);
  }

  disableNow(index: number): void {
    this.buttons[index]?.setAttribute('aria-disabled', 'true');
  }

  async disable(index: number): Promise<void> {
    this.buttons[index]?.setAttribute('disabled', '');
    await nextTick();
  }

  async disableAndBlur(index: number): Promise<void> {
    const button = this.buttons[index];

    button?.setAttribute('disabled', '');
    button?.blur();
    await nextTick();
  }

  async disableAll(): Promise<void> {
    this.buttons.forEach((button) => {
      button.setAttribute('disabled', '');
    });

    await nextTick();
  }

  rest(index: number): void {
    this.navigation.setActive(index, { focus: false });
  }

  relabelNow(index: number, label: string): void {
    const button = this.buttons[index];

    if (button) {
      button.textContent = label;
    }
  }

  countIndexBuilds(run: () => void): number {
    const spies = this.buttons.map((button) => vi.spyOn(button, 'getAttribute'));

    run();

    const reads = spies.reduce(
      (count, spy) =>
        count + spy.mock.calls.reduce((own, [name]) => own + Number(name === 'aria-disabled'), 0),
      0,
    );

    for (const spy of spies) {
      spy.mockRestore();
    }
    return reads / this.buttons.length;
  }

  async remove(index: number): Promise<void> {
    const labels = this.wrapper.props('labels');

    await this.wrapper.setProps({
      labels: labels.filter((_, position) => position !== index),
    });
  }

  async append(...labels: string[]): Promise<void> {
    await this.wrapper.setProps({ labels: [...this.wrapper.props('labels'), ...labels] });
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
