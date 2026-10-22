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

  appendNow(label: string): void {
    const button = document.createElement('button');

    button.type = 'button';
    button.setAttribute('role', 'option');
    button.id = `item-${this.buttons.length}`;
    button.tabIndex = -1;
    button.textContent = label;
    this.container.append(button);
  }

  disableNow(index: number): void {
    this.buttons[index]?.setAttribute('aria-disabled', 'true');
  }

  relabelNow(index: number, label: string): void {
    const button = this.buttons[index];

    if (button) {
      button.textContent = label;
    }
  }

  countQueries(run: () => void): number {
    const spy = vi.spyOn(this.container, 'querySelectorAll');

    run();

    const count = spy.mock.calls.length;

    spy.mockRestore();
    return count;
  }

  async remove(index: number): Promise<void> {
    this.buttons[index]?.remove();
    await nextTick();
  }

  async append(...labels: string[]): Promise<void> {
    await this.wrapper.setProps({ labels: [...this.wrapper.props('labels'), ...labels] });
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
