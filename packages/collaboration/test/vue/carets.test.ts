import { afterEach, describe, expect, it } from 'vite-plus/test';
import { CaretsDriver } from './carets-driver';

let carets: CaretsDriver | undefined;

const mounted = async (): Promise<CaretsDriver> => {
  carets = await CaretsDriver.mount();
  return carets;
};

afterEach(() => {
  carets?.unmount();
  carets = undefined;
});

describe('a caret of someone else beside a line that moves', () => {
  it('follows the line when a class shifts it', async () => {
    const scene = await mounted();

    expect(scene.caret).toBe('translate(40px, 30px)');

    await scene.pushLine(32);

    expect(scene.caret).toBe('translate(72px, 30px)');
  });

  it('follows a transition that starts without a change in the markup', async () => {
    const scene = await mounted();

    await scene.startTransition(12);

    expect(scene.caret).toBe('translate(52px, 30px)');
  });

  it('follows the text when a picture in it has loaded', async () => {
    const scene = await mounted();

    await scene.loadPicture(100);

    expect(scene.caret).toBe('translate(140px, 30px)');
  });

  it('follows a running animation frame by frame and stops with it', async () => {
    const scene = await mounted();

    await scene.glideLine([50, 60, 72]);

    expect(scene.caret).toBe('translate(40px, 30px)');

    await scene.paint();

    expect(scene.caret).toBe('translate(50px, 30px)');

    await scene.paint();
    await scene.paint();

    expect(scene.caret).toBe('translate(72px, 30px)');

    const settled = scene.measurements;

    await scene.paint();

    expect(scene.measurements).toBe(settled);
  });

  it('does not chase an animation that never ends', async () => {
    const scene = await mounted();

    await scene.glideLine([50, 60, 72], Infinity);

    const settled = scene.measurements;

    await scene.paint();

    expect(scene.caret).toBe('translate(40px, 30px)');
    expect(scene.measurements).toBe(settled);
  });

  it('measures once for a change and not again for what it wrote itself', async () => {
    const scene = await mounted();
    const before = scene.measurements;

    await scene.pushLine(32);
    await scene.paint();
    await scene.paint();

    expect(scene.measurements).toBe(before + 1);
  });
});
