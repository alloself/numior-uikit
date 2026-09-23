import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useFloating } from '../src';
import { captureWithElements } from './harness/elements';

const { cleanup, computePosition } = vi.hoisted(() => ({
  cleanup: vi.fn<() => void>(),
  computePosition: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
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
