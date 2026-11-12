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
  it('goes after its text when the editor says the text may have moved', async () => {
    const scene: CaretsDriver = await mounted();

    expect(scene.caret).toBe('translate(40px, 30px)');

    scene.shiftText(32);

    expect(scene.caret).toBe('translate(72px, 30px)');
  });

  it('stops listening to the editor once the layer is gone', async () => {
    const scene: CaretsDriver = await mounted();

    expect(scene.listening).toBe(true);

    scene.unmount();

    expect(scene.listening).toBe(false);
  });
});
