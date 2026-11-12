import { vi } from 'vite-plus/test';
import { useAfterRelease, type AfterRelease } from '../../src';
import { captureSetup, type Capture } from './capture';

const RIGHT_BUTTON = 2;

export class AfterReleaseHarness {
  static mount(): AfterReleaseHarness {
    return new AfterReleaseHarness(captureSetup(() => useAfterRelease()));
  }

  private readonly ran: string[] = [];

  private constructor(private readonly capture: Capture<AfterRelease>) {}

  get actions(): readonly string[] {
    return [...this.ran];
  }

  ask(name: string, held: boolean): void {
    const event = new MouseEvent('contextmenu', { buttons: held ? RIGHT_BUTTON : 0 });

    this.capture.value(event, () => {
      this.ran.push(name);
    });
  }

  release(): void {
    window.dispatchEvent(new PointerEvent('pointerup'));
  }

  loseThePointer(): void {
    window.dispatchEvent(new PointerEvent('pointercancel'));
  }

  settle(): void {
    vi.runAllTimers();
  }

  unmount(): void {
    this.capture.wrapper.unmount();
  }
}
