import { nextTick } from 'vue';
import { useRestingHover, type RestingHover } from '../../src';
import { captureSetup, type Capture } from './capture';

interface Spot {
  readonly x: number;
  readonly y: number;
}

type Pointer = 'mouse' | 'touch';

const at = (spot: Spot, pointerType: Pointer): PointerEventInit => ({
  clientX: spot.x,
  clientY: spot.y,
  pointerType,
  bubbles: true,
});

export class RestingHoverHarness {
  static mount(): RestingHoverHarness {
    const target = document.createElement('div');
    const part = document.createElement('span');
    const elsewhere = document.createElement('p');

    target.append(part);
    document.body.append(target, elsewhere);

    return new RestingHoverHarness(
      captureSetup(() => useRestingHover(target)),
      target,
      part,
      elsewhere,
    );
  }

  private constructor(
    private readonly capture: Capture<RestingHover>,
    private readonly target: HTMLElement,
    private readonly part: HTMLElement,
    private readonly elsewhere: HTMLElement,
  ) {}

  get hovered(): boolean {
    return this.capture.value.hovered.value;
  }

  enter(spot: Spot, pointer: Pointer = 'mouse'): void {
    this.target.dispatchEvent(
      new PointerEvent('pointerenter', { ...at(spot, pointer), bubbles: false }),
    );
  }

  moveOver(spot: Spot): void {
    this.part.dispatchEvent(new PointerEvent('pointermove', at(spot, 'mouse')));
  }

  async leave(spot: Spot, pointer: Pointer = 'mouse'): Promise<void> {
    this.target.dispatchEvent(
      new PointerEvent('pointerleave', { ...at(spot, pointer), bubbles: false }),
    );

    await nextTick();
  }

  moveElsewhere(spot: Spot): void {
    this.elsewhere.dispatchEvent(new PointerEvent('pointermove', at(spot, 'mouse')));
  }

  pressElsewhere(spot: Spot): void {
    this.elsewhere.dispatchEvent(new PointerEvent('pointerdown', at(spot, 'mouse')));
  }

  end(): void {
    this.capture.value.end();
  }

  unmount(): void {
    this.capture.wrapper.unmount();
    this.target.remove();
    this.elsewhere.remove();
  }
}
