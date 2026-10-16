import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
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

const sideVector = (element: HTMLElement): string =>
  `${element.style.getPropertyValue('--_side-x')} ${element.style.getPropertyValue('--_side-y')}`;

describe('useFloating', () => {
  it('writes the position, the resolved side and the arrow straight to the elements', async () => {
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

    expect(sideVector(capture.second)).toBe('0 1');
    await flushPromises();

    expect(capture.second.style.position).toBe('fixed');
    expect(capture.second.style.left).toBe('10px');
    expect(capture.second.style.top).toBe('20px');
    expect(sideVector(capture.second)).toBe('0 -1');
    expect(arrowElement.style.left).toBe('5px');
    expect(arrowElement.style.bottom).toBe('0px');
    expect(arrowElement.style.top).toBe('');

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
    expect(capture.second.style.minInlineSize).toBe('240px');
    expect(capture.second.style.maxBlockSize).toBe('320px');
    capture.unmount();

    const capped = captureWithElements((reference, floating) =>
      useFloating(reference, floating, { size: { fitHeight: true, maxBlockSize: 200 } }),
    );

    await flushPromises();
    expect(capped.second.style.maxBlockSize).toBe('200px');
    capped.unmount();
    const plain = captureWithElements((reference, floating) => useFloating(reference, floating));
    await flushPromises();
    expect(plain.second.style.minInlineSize).toBe('');
    plain.unmount();
  });

  it('announces the requested side before measuring and stays idle while disabled', () => {
    computePosition.mockClear();

    const capture = captureWithElements((reference, floating) =>
      useFloating(reference, floating, { placement: 'right-start', enabled: false }),
    );

    expect(sideVector(capture.second)).toBe(' ');
    expect(capture.second.style.left).toBe('');
    expect(computePosition).not.toHaveBeenCalled();
    capture.unmount();
  });
});
