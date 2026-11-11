import { afterEach, describe, expect, it } from 'vite-plus/test';
import { LayoutWatchDriver } from './drivers/layout-watch';

let scene: LayoutWatchDriver | undefined;

const listening = async (): Promise<LayoutWatchDriver> => {
  scene = await LayoutWatchDriver.mount();
  scene.listen();
  return scene;
};

afterEach(() => {
  scene?.unmount();
  scene = undefined;
});

describe('an overlay told that the text may have moved', () => {
  it('hears once when a class shifts a line', async () => {
    const layout = await listening();

    await layout.shiftLine();
    await layout.paint();

    expect(layout.calls).toBe(1);
  });

  it('hears when the text of a line changes', async () => {
    const layout = await listening();

    await layout.retype('A longer line');

    expect(layout.calls).toBe(1);
  });

  it('hears when a bar appears above the text', async () => {
    const layout = await listening();

    await layout.addBar();

    expect(layout.calls).toBe(1);
  });

  it('hears a transition that starts without a change in the markup', async () => {
    const layout = await listening();

    await layout.startTransition();

    expect(layout.calls).toBe(1);
  });

  it('hears a picture that has loaded inside the text', async () => {
    const layout = await listening();

    await layout.loadPicture();

    expect(layout.calls).toBe(1);
  });

  it('hears every frame of a running animation and stops with it', async () => {
    const layout = await listening();

    await layout.glideLine(2);

    expect(layout.calls).toBe(1);

    await layout.paint();
    await layout.paint();

    expect(layout.calls).toBe(3);

    await layout.paint();

    expect(layout.calls).toBe(3);
  });

  it('does not chase an animation that never ends', async () => {
    const layout = await listening();

    await layout.glideLine(5, Infinity);
    await layout.paint();

    expect(layout.calls).toBe(1);
  });

  it('hears nothing after it has left', async () => {
    const layout = await listening();

    layout.leave();
    await layout.shiftLine();

    expect(layout.calls).toBe(0);
  });
});
