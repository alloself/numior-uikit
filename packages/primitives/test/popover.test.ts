import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { nextTick, ref } from 'vue';
import { usePopover } from '../src';
import { captureWithElements } from './harness/elements';
import { dismissNatively, installTopLayer } from './harness/top-layer';

describe('usePopover', () => {
  let topLayer = installTopLayer();

  beforeEach(() => {
    topLayer = installTopLayer();
  });

  afterEach(() => topLayer.restore());

  it('drives the native popover from the model and exposes invoker attributes', async () => {
    const open = ref(false);
    const capture = captureWithElements((_, content) => usePopover(content, { open, id: 'menu' }));
    const control = capture.value;
    expect(control.contentAttrs.value).toMatchObject({ id: 'menu', popover: 'auto' });

    expect(control.invokerAttrs.value).toEqual({
      popovertarget: 'menu',
      'aria-expanded': 'false',
      'aria-controls': 'menu',
    });

    capture.second.addEventListener('beforetoggle', control.contentAttrs.value.onBeforetoggle);
    open.value = true;
    await nextTick();
    expect(topLayer.log.showPopover).toBe(1);
    expect(control.invokerAttrs.value['aria-expanded']).toBe('true');
    control.hide();
    await nextTick();
    expect(topLayer.log.hidePopover).toBe(1);
    expect(open.value).toBe(false);
    capture.unmount();
  });

  it('raises an open popover by hiding and showing it again', async () => {
    const open = ref(false);
    const capture = captureWithElements((_, content) => usePopover(content, { open }));

    capture.second.addEventListener(
      'beforetoggle',
      capture.value.contentAttrs.value.onBeforetoggle,
    );

    open.value = true;
    await nextTick();
    capture.value.raise();
    expect(topLayer.log.hidePopover).toBe(1);
    expect(topLayer.log.showPopover).toBe(2);
    expect(open.value).toBe(true);
    await nextTick();
    expect(topLayer.log.showPopover).toBe(2);
    capture.value.hide();
    await nextTick();
    capture.value.raise();
    expect(topLayer.log.showPopover).toBe(2);
    capture.unmount();
  });

  it('follows native light dismiss and honors manual mode', async () => {
    const open = ref(true);

    const capture = captureWithElements((_, content) =>
      usePopover(content, { open, mode: 'manual' }),
    );

    capture.second.addEventListener(
      'beforetoggle',
      capture.value.contentAttrs.value.onBeforetoggle,
    );

    expect(capture.value.contentAttrs.value.popover).toBe('manual');
    expect(topLayer.log.showPopover).toBe(1);
    dismissNatively(capture.second);
    expect(open.value).toBe(false);
    await nextTick();
    expect(topLayer.log.hidePopover).toBe(0);
    capture.unmount();
  });
});
