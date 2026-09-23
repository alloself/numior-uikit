import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useFloating } from '../src';
import { captureWithElements } from './harness/elements';

interface SizeApplyArgs {
  readonly rects: { readonly reference: { readonly width: number } };
  readonly availableHeight: number;
}

const { cleanup, computePosition, sizeHooks } = vi.hoisted(() => ({
  cleanup: vi.fn<() => void>(),
  computePosition: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  sizeHooks: new Array<(args: SizeApplyArgs) => void>(),
}));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (...args: unknown[]) => computePosition(...args),
  autoUpdate: (_reference: Element, _floating: HTMLElement, update: () => void) => {
    update();
    return cleanup;
  },
  offset: (value: number) => ({ name: 'offset', value }),
  flip: () => ({ name: 'flip' }),
  shift: () => ({ name: 'shift' }),
  arrow: () => ({ name: 'arrow' }),
  size: (options: { apply: (args: SizeApplyArgs) => void }) => {
    sizeHooks.push(options.apply);
    return { name: 'size' };
  },
}));

describe('useFloating', () => {
  it('positions the floating element, reports the resolved side and stops when disabled', async () => {
    computePosition.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'top',
      strategy: 'fixed',
      middlewareData: { arrow: { x: 5 } },
    });
    const enabled = ref(true);
    const arrowElement = document.createElement('span');
    const capture = captureWithElements((reference, floating) =>
      useFloating(reference, floating, {
        placement: 'bottom',
        offset: 4,
        arrow: arrowElement,
        enabled,
      }),
    );
    await flushPromises();
    expect(capture.value.floatingStyles.value).toEqual({
      position: 'fixed',
      left: '10px',
      top: '20px',
    });
    expect(capture.value.placement.value).toBe('top');
    expect(capture.value.side.value).toBe('top');
    expect(capture.value.arrowStyles.value).toEqual({ left: '5px' });
    expect(computePosition).toHaveBeenCalledWith(
      capture.first,
      capture.second,
      expect.objectContaining({ placement: 'bottom', strategy: 'fixed' }),
    );
    enabled.value = false;
    await nextTick();
    expect(cleanup).toHaveBeenCalledTimes(1);
    capture.unmount();
  });

  it('matches the reference width and caps the height when size is requested', async () => {
    sizeHooks.length = 0;
    computePosition.mockImplementation(async () => {
      for (const hook of sizeHooks) {
        hook({ rects: { reference: { width: 240 } }, availableHeight: 320 });
      }
      return { x: 0, y: 0, placement: 'bottom-start', strategy: 'fixed', middlewareData: {} };
    });
    const capture = captureWithElements((reference, floating) =>
      useFloating(reference, floating, { size: { matchWidth: true, fitHeight: true } }),
    );
    await flushPromises();
    expect(capture.value.floatingStyles.value).toMatchObject({
      minInlineSize: '240px',
      maxBlockSize: '320px',
    });
    capture.unmount();
    const plain = captureWithElements((reference, floating) => useFloating(reference, floating));
    await flushPromises();
    expect(plain.value.floatingStyles.value).not.toHaveProperty('minInlineSize');
    plain.unmount();
  });

  it('starts from the requested placement with neutral coordinates', () => {
    const capture = captureWithElements((reference, floating) =>
      useFloating(reference, floating, { placement: 'right-start', enabled: false }),
    );
    expect(capture.value.side.value).toBe('right');
    expect(capture.value.floatingStyles.value).toEqual({
      position: 'fixed',
      left: '0px',
      top: '0px',
    });
    capture.unmount();
  });
});
