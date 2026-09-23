import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDialog, type DialogOptions } from '../src';
import { captureWithElements } from './harness/elements';
import { installTopLayer } from './harness/top-layer';

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

describe('useDialog', () => {
  let topLayer = installTopLayer();
  beforeEach(() => {
    topLayer = installTopLayer();
  });
  afterEach(() => topLayer.restore());

  it('marks dialogs opened above another modal as nested until the one below closes', async () => {
    const firstOpen = ref(true);
    const secondOpen = ref(false);
    const first = mountDialog({ open: firstOpen });
    const second = mountDialog({ open: secondOpen });
    expect(first.value.nested.value).toBe(false);
    secondOpen.value = true;
    await nextTick();
    expect(second.value.nested.value).toBe(true);
    expect(first.value.nested.value).toBe(false);
    first.value.close();
    await nextTick();
    expect(second.value.nested.value).toBe(false);
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
