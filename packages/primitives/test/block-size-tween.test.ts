import { describe, expect, it } from 'vitest';
import { TweenHarness } from './harness/tween';

describe('useBlockSizeTween', () => {
  it('animates the block size across an update and clips the content at the moving edge', async () => {
    const tween = TweenHarness.mount();

    await tween.render(3);

    expect(tween.tweens).toEqual([
      {
        keyframes: [
          { blockSize: '40px', clipPath: 'inset(-100vmax -100vmax 0)' },
          { blockSize: '120px', clipPath: 'inset(-100vmax -100vmax 0)' },
        ],
        options: { duration: 200, easing: 'linear' },
      },
    ]);

    tween.unmount();
  });

  it('stays still when the height is the same or the motion tokens are zeroed', async () => {
    const same = TweenHarness.mount();

    await same.render(1);
    expect(same.tweens).toEqual([]);
    same.unmount();

    const reduced = TweenHarness.mount({ duration: '0ms' });

    await reduced.render(3);
    expect(reduced.tweens).toEqual([]);
    reduced.unmount();
  });
});
