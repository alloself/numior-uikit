import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, ref } from 'vue';
import { useDialog, type DialogOptions } from '../src';
import { captureWithElements } from './harness/elements';
import { installTopLayer } from './harness/top-layer';

interface RootMetrics {
  readonly scrollHeight: number;
  readonly clientHeight: number;
  readonly scrollbar: number;
}

const asDialog = (element: HTMLElement | null): HTMLDialogElement | null =>
  element instanceof HTMLDialogElement ? element : null;

const mountDialog = (options: DialogOptions) => {
  const capture = captureWithElements(
    (_, dialog) => useDialog(() => asDialog(dialog.value), options),
    ['button', 'dialog'],
  );

  const { attrs } = capture.value;
  capture.second.addEventListener('cancel', attrs.onCancel);
  capture.second.addEventListener('close', attrs.onClose);
  capture.second.addEventListener('pointerdown', attrs.onPointerdown);
  capture.second.addEventListener('click', attrs.onClick);
  return capture;
};

const press = (dialog: HTMLElement, clientX: number) => {
  dialog.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY: 0, bubbles: true }));
  dialog.dispatchEvent(new MouseEvent('click', { clientX, clientY: 0, bubbles: true }));
};

const ROOT_METRICS = ['scrollHeight', 'clientHeight', 'clientWidth'] as const;

const defineMetric = (name: string, get: () => number): void => {
  Object.defineProperty(document.documentElement, name, { configurable: true, get });
};

const describeRoot = (metrics: RootMetrics): void => {
  const root = document.documentElement;

  const clientWidth = () =>
    window.innerWidth - (root.style.overflow === 'hidden' ? 0 : metrics.scrollbar);

  defineMetric('scrollHeight', () => metrics.scrollHeight);
  defineMetric('clientHeight', () => metrics.clientHeight);
  defineMetric('clientWidth', clientWidth);
};

const forgetRoot = (): void => {
  const root = document.documentElement;

  for (const metric of ROOT_METRICS) {
    Reflect.deleteProperty(root, metric);
  }
  root.removeAttribute('style');
};

const rootStyle = () => {
  const { style } = document.documentElement;

  return { overflow: style.overflow, padding: style.paddingInlineEnd };
};

describe('useDialog', () => {
  let topLayer = installTopLayer();

  beforeEach(() => {
    topLayer = installTopLayer();
  });

  afterEach(() => {
    topLayer.restore();
    forgetRoot();
  });

  it('locks a scrolling root while any modal is open and restores its inline styles after', async () => {
    describeRoot({ scrollHeight: 2000, clientHeight: 800, scrollbar: 15 });
    document.documentElement.style.overflow = 'auto';
    const firstOpen = ref(true);
    const secondOpen = ref(true);
    const first = mountDialog({ open: firstOpen });
    expect(rootStyle()).toEqual({ overflow: 'hidden', padding: '15px' });

    const second = mountDialog({ open: secondOpen });
    second.value.close();
    await nextTick();
    expect(rootStyle().overflow).toBe('hidden');

    first.value.close();
    await nextTick();
    expect(rootStyle()).toEqual({ overflow: 'auto', padding: '' });

    second.unmount();
    first.unmount();
  });

  it('pads nothing when the scrollbar takes no space', () => {
    describeRoot({ scrollHeight: 2000, clientHeight: 800, scrollbar: 0 });
    const capture = mountDialog({ open: ref(true) });
    expect(rootStyle()).toEqual({ overflow: 'hidden', padding: '' });

    capture.unmount();
  });

  it('leaves a root that does not scroll untouched', () => {
    describeRoot({ scrollHeight: 600, clientHeight: 800, scrollbar: 15 });
    const capture = mountDialog({ open: ref(true) });
    expect(rootStyle()).toEqual({ overflow: '', padding: '' });

    capture.unmount();
  });

  it('marks a modal as covered while another modal is open above it', async () => {
    const firstOpen = ref(true);
    const secondOpen = ref(false);
    const first = mountDialog({ open: firstOpen });
    const second = mountDialog({ open: secondOpen });
    expect(first.value.covered.value).toBe(false);

    secondOpen.value = true;
    await nextTick();
    expect(first.value.covered.value).toBe(true);
    expect(second.value.covered.value).toBe(false);

    second.value.close();
    await nextTick();
    expect(first.value.covered.value).toBe(false);

    second.unmount();
    first.unmount();
  });

  it('opens modally from the model and reports the return value on close', async () => {
    const open = ref(true);
    const onClose = vi.fn<(value: string) => void>();
    const capture = mountDialog({ open, onClose });
    expect(topLayer.log.showModal).toBe(1);
    expect(capture.second.hasAttribute('open')).toBe(true);

    capture.value.close('confirm');
    expect(open.value).toBe(false);
    expect(capture.value.returnValue.value).toBe('confirm');
    expect(onClose).toHaveBeenCalledWith('confirm');

    await nextTick();
    open.value = true;
    await nextTick();
    expect(topLayer.log.showModal).toBe(2);

    capture.unmount();
  });

  it('blocks Escape only when not dismissible', () => {
    const dismissible = ref(true);
    const capture = mountDialog({ open: ref(true), dismissible });

    const cancel = () => {
      const event = new Event('cancel', { cancelable: true });
      capture.second.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(cancel()).toBe(false);

    dismissible.value = false;
    expect(cancel()).toBe(true);

    capture.unmount();
  });

  it('closes on a backdrop press but not on a press inside', () => {
    const open = ref(true);
    const capture = mountDialog({ open });
    press(capture.second, 0);
    expect(open.value).toBe(true);

    press(capture.second, 40);
    expect(open.value).toBe(false);

    capture.unmount();
  });

  it('ignores the backdrop when closeOnBackdrop is off', () => {
    const open = ref(true);
    const capture = mountDialog({ open, closeOnBackdrop: false });
    press(capture.second, 40);
    expect(open.value).toBe(true);

    capture.unmount();
  });
});
