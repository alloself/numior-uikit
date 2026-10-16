import { mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import {
  useReorder,
  type Reorder,
  type ReorderAxis,
  type ReorderEvent,
  type ReorderState,
} from '../../src';

export interface ReorderHarnessOptions {
  readonly axis?: ReorderAxis;
  readonly count?: number;
  readonly size?: number;
  readonly canMove?: (from: number, to: number) => boolean;
  readonly rtl?: boolean;
  readonly viewport?: number;
}

const defineViewport = (element: HTMLElement, height: number): void => {
  const rect = { top: 0, bottom: height, left: 0, right: height, width: height, height };

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ ...rect, x: 0, y: 0, toJSON: () => ({}) }),
    configurable: true,
  });
};

type Outcome = { readonly ran: true; readonly value: Reorder } | { readonly ran: false };

const pointer = (type: string, client: number, axis: ReorderAxis, pointerId = 1): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    button: 0,
    clientX: axis === 'x' ? client : 0,
    clientY: axis === 'y' ? client : 0,
  });

export class ReorderHarness {
  static mount(options: ReorderHarnessOptions = {}): ReorderHarness {
    const axis = options.axis ?? 'y';
    const size = options.size ?? 40;
    const count = options.count ?? 5;
    const moves: Array<readonly [number, number]> = [];
    const changes: ReorderState[] = [];
    const events: ReorderEvent[] = [];
    const outcome: { current: Outcome } = { current: { ran: false } };

    const Host = defineComponent({
      setup() {
        const container = shallowRef<HTMLElement | null>(null);

        const scrolled = (client: number): number => client + (container.value?.scrollTop ?? 0);

        const reorder = useReorder({
          axis,
          count: () => count,
          container,
          indexAt: (client) =>
            Math.min(count - 1, Math.max(0, Math.floor(scrolled(client) / size))),
          canMove: options.canMove,
          onMove: (from, to) => moves.push([from, to]),
          onChange: (state) => changes.push(state),
          onEvent: (event) => events.push(event),
          rtl: () => options.rtl,
        });

        outcome.current = { ran: true, value: reorder };
        return () =>
          h(
            'div',
            { ref: container, class: 'list' },
            Array.from({ length: count }, (_, index) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'handle',
                  onPointerdown: (event: PointerEvent) => reorder.onPointerdown(index, event),
                  onKeydown: (event: KeyboardEvent) => {
                    if (reorder.onKeydown(index, event)) {
                      event.preventDefault();
                    }
                  },
                },
                `Item ${index}`,
              ),
            ),
          );
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });
    if (!outcome.current.ran) {
      throw new Error('useReorder did not run');
    }
    if (options.viewport !== undefined) {
      defineViewport(wrapper.element, options.viewport);
    }
    return new ReorderHarness(wrapper, outcome.current.value, axis, moves, changes, events);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly reorder: Reorder,
    private readonly axis: ReorderAxis,
    readonly moves: Array<readonly [number, number]>,
    readonly changes: ReorderState[],
    readonly events: ReorderEvent[],
  ) {}

  get state(): ReorderState {
    return this.reorder.state.value;
  }

  get target(): number | undefined {
    const { state } = this;
    return state.phase === 'dragging' || state.phase === 'keyboard' ? state.to : undefined;
  }

  get source(): number | undefined {
    return this.reorder.source.value;
  }

  get scrollTop(): number {
    return this.wrapper.element.scrollTop;
  }

  async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await nextTick();
  }

  private handle(index: number): HTMLElement {
    return this.wrapper.findAll<HTMLElement>('.handle')[index]?.element ?? this.fail(index);
  }

  private fail(index: number): never {
    throw new Error(`No handle ${index}`);
  }

  async pointerDown(index: number, client: number): Promise<void> {
    this.handle(index).dispatchEvent(pointer('pointerdown', client, this.axis));
    await nextTick();
  }

  async pointerMove(client: number): Promise<boolean> {
    const event = pointer('pointermove', client, this.axis);
    const allowed = window.dispatchEvent(event);
    await nextTick();
    return !allowed;
  }

  async pointerUp(client: number): Promise<void> {
    window.dispatchEvent(pointer('pointerup', client, this.axis));
    await nextTick();
  }

  async pointerCancel(): Promise<void> {
    window.dispatchEvent(pointer('pointercancel', 0, this.axis));
    await nextTick();
  }

  async press(index: number, key: string): Promise<boolean> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    this.handle(index).dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async pressWindow(key: string): Promise<void> {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
