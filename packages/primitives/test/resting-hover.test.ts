import { afterEach, describe, expect, it } from 'vite-plus/test';
import { RestingHoverHarness } from './harness/resting-hover';

const INSIDE = { x: 40, y: 40 };

const FURTHER = { x: 44, y: 48 };

const OUTSIDE = { x: 400, y: 300 };

let hover: RestingHoverHarness | undefined;

const mounted = (): RestingHoverHarness => {
  hover = RestingHoverHarness.mount();
  return hover;
};

afterEach(() => {
  hover?.unmount();
  hover = undefined;
});

describe('useRestingHover', () => {
  it('lasts from the pointer coming in until it moves out', async () => {
    const owner = mounted();

    owner.enter(INSIDE);

    expect(owner.hovered).toBe(true);

    await owner.leave(OUTSIDE);

    expect(owner.hovered).toBe(false);
  });

  it('stays when the part under a mouse at rest goes away', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    owner.moveOver(FURTHER);
    await owner.leave(FURTHER);

    expect(owner.hovered).toBe(true);
  });

  it('ignores a move the browser reports for the same spot', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    await owner.leave(INSIDE);
    owner.moveElsewhere(INSIDE);

    expect(owner.hovered).toBe(true);
  });

  it('ends once the mouse at rest moves on over something else', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    await owner.leave(INSIDE);
    owner.moveElsewhere(OUTSIDE);

    expect(owner.hovered).toBe(false);
  });

  it('goes on when the mouse at rest moves on over the target', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    await owner.leave(INSIDE);
    owner.moveOver(FURTHER);
    owner.moveElsewhere(FURTHER);

    expect(owner.hovered).toBe(true);

    await owner.leave(OUTSIDE);

    expect(owner.hovered).toBe(false);
  });

  it('ends when the mouse at rest presses something else', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    await owner.leave(INSIDE);
    owner.pressElsewhere(INSIDE);

    expect(owner.hovered).toBe(false);
  });

  it('ends at once for a finger that lifts where it touched', async () => {
    const owner = mounted();

    owner.enter(INSIDE, 'touch');
    await owner.leave(INSIDE, 'touch');

    expect(owner.hovered).toBe(false);
  });

  it('ends when its owner says nothing is left to hover', async () => {
    const owner = mounted();

    owner.enter(INSIDE);
    owner.end();

    expect(owner.hovered).toBe(false);
  });
});
