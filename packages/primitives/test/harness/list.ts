import { mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, nextTick, ref, shallowRef, type Ref } from 'vue';
import {
  useListNavigation,
  type ListFocusMode,
  type ListNavigation,
  type ListOrientation,
} from '../../src';

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

const DEFAULT_LABELS = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date'];

type Outcome = { readonly ran: true; readonly value: ListNavigation } | { readonly ran: false };

export class ListHarness {
  static mount(options: ListHarnessOptions = {}): ListHarness {
    const labels = ref([...(options.labels ?? DEFAULT_LABELS)]);
    const role = options.role ?? 'option';
    const outcome: { current: Outcome } = { current: { ran: false } };

    const Host = defineComponent({
      setup() {
        const container = shallowRef<HTMLElement | null>(null);

        const navigation = useListNavigation(container, {
          selector: `[role="${role}"]`,
          mode: () => options.mode,
          orientation: () => options.orientation,
          loop: () => options.loop,
          pageSize: () => options.pageSize,
        });

        outcome.current = { ran: true, value: navigation };
        return () =>
          h('div', { dir: options.dir }, [
            h(
              'div',
              {
                ref: container,
                role: 'listbox',
                onKeydown: navigation.onKeydown,
                onFocusin: navigation.onFocusin,
              },
              labels.value.map((label, index) =>
                h(
                  'button',
                  {
                    key: label,
                    type: 'button',
                    role,
                    id: `item-${index}`,
                    tabindex: -1,
                    'aria-disabled': options.disabled?.includes(index) ? 'true' : undefined,
                  },
                  label,
                ),
              ),
            ),
          ]);
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });
    if (!outcome.current.ran) {
      throw new Error('setup did not run');
    }
    return new ListHarness(wrapper, outcome.current.value, labels);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly navigation: ListNavigation,
    private readonly labels: Ref<string[]>,
  ) {}

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

  async remove(index: number): Promise<void> {
    this.buttons[index]?.remove();
    await nextTick();
  }

  async append(...labels: string[]): Promise<void> {
    this.labels.value = [...this.labels.value, ...labels];
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
