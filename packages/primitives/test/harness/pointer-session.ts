import { usePointerSession, type PointerSession } from '../../src';
import { captureSetup, type Capture } from './capture';

export interface PointerSessionHarnessOptions {
  readonly capture?: boolean;
}

const pointer = (type: string): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1 });

export class PointerSessionHarness {
  static mount(options: PointerSessionHarnessOptions = {}): PointerSessionHarness {
    return new PointerSessionHarness(
      captureSetup(() => usePointerSession({ capture: options.capture === true })),
    );
  }

  private readonly heard: string[] = [];

  private constructor(private readonly capture: Capture<PointerSession>) {}

  get events(): readonly string[] {
    return [...this.heard];
  }

  press(): void {
    this.capture.value.begin({
      move: () => {
        this.heard.push('move');
      },
      up: () => {
        this.heard.push('up');
      },
      cancel: () => {
        this.heard.push('cancel');
      },
    });
  }

  pressThen(action: () => void): void {
    this.capture.value.begin({
      move: () => {
        this.heard.push('move');
        action();
      },
    });
  }

  end(): void {
    this.capture.value.end();
  }

  static move(target: EventTarget = document.body): void {
    target.dispatchEvent(pointer('pointermove'));
  }

  static release(target: EventTarget = document.body): void {
    target.dispatchEvent(pointer('pointerup'));
  }

  static loseThePointer(): void {
    document.body.dispatchEvent(pointer('pointercancel'));
  }

  unmount(): void {
    this.capture.wrapper.unmount();
  }
}
