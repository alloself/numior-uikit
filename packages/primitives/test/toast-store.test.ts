import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { ToastHold, ToastTone, useToast } from '../src';
import { captureSetup } from './harness/capture';
import { ToastHarness } from './harness/toast';

describe('toast store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies defaults, auto-dismisses after the duration and removes after the exit', () => {
    const toasts = ToastHarness.create();
    const id = toasts.show({ title: 'Saved' });
    expect(id).toBe('nui-toast-1');

    expect(toasts.record(id)).toMatchObject({
      tone: ToastTone.Neutral,
      duration: 5000,
      closable: true,
      leaving: false,
    });

    toasts.advance(4999);
    expect(toasts.leavingIds).toEqual([]);

    toasts.advance(1);
    expect(toasts.leavingIds).toEqual([id]);

    toasts.advance(200);
    expect(toasts.ids).toEqual([]);
  });

  it('keeps persistent toasts and holds every countdown until the last reason to hold is gone', () => {
    const toasts = ToastHarness.create({ duration: 1000 });
    const sticky = toasts.show({ title: 'Stay', duration: 0 });
    const timed = toasts.show({ title: 'Go' });

    toasts.advance(400);
    toasts.hold(ToastHold.Hover);
    toasts.hold(ToastHold.Focus);
    toasts.advance(5000);
    toasts.release(ToastHold.Hover);
    toasts.advance(5000);

    expect(toasts.leavingIds).toEqual([]);

    toasts.release(ToastHold.Focus);
    toasts.advance(599);

    expect(toasts.leavingIds).toEqual([]);

    toasts.advance(1);

    expect(toasts.leavingIds).toEqual([timed]);

    toasts.advance(10000);

    expect(toasts.ids).toEqual([sticky]);
  });

  it('holds a toast shown or promoted from the queue while the stack is held', () => {
    const toasts = ToastHarness.create({ duration: 1000, limit: 1 });
    const first = toasts.show({ title: 'A' });

    toasts.hold(ToastHold.Hover);

    const second = toasts.show({ title: 'B' });

    toasts.dismiss(first);
    toasts.advance(200);
    toasts.advance(5000);

    expect(toasts.visibleIds).toEqual([second]);
    expect(toasts.leavingIds).toEqual([]);

    toasts.release(ToastHold.Hover);
    toasts.advance(999);

    expect(toasts.leavingIds).toEqual([]);

    toasts.advance(1);

    expect(toasts.leavingIds).toEqual([second]);
  });

  it('queues beyond the limit and starts a queued timer only when promoted', () => {
    const toasts = ToastHarness.create({ duration: 1000, limit: 2 });
    toasts.show({ title: 'A' });
    toasts.show({ title: 'B' });
    const third = toasts.show({ title: 'C' });
    expect(toasts.visibleIds).toEqual(['nui-toast-1', 'nui-toast-2']);
    expect(toasts.queued).toBe(1);

    toasts.advance(1200);
    expect(toasts.visibleIds).toEqual([third]);

    toasts.advance(999);
    expect(toasts.leavingIds).toEqual([]);

    toasts.advance(1);
    expect(toasts.leavingIds).toEqual([third]);
  });

  it('ignores repeated dismissals, clears everything and replaces a toast by id', () => {
    const toasts = ToastHarness.create({ duration: 1000 });
    const id = toasts.show({ id: 'save', title: 'Saving' });
    toasts.dismiss(id);
    toasts.dismiss(id);
    expect(toasts.leavingIds).toEqual(['save']);

    toasts.show({ id: 'save', title: 'Saved' });
    expect(toasts.record('save')).toMatchObject({ title: 'Saved', leaving: false });

    toasts.advance(300);
    expect(toasts.ids).toEqual(['save']);

    toasts.show({ title: 'Other' });
    toasts.clear();
    expect(toasts.leavingIds).toEqual(['save', 'nui-toast-1']);

    toasts.advance(200);
    expect(toasts.ids).toEqual([]);
  });

  it('exposes tone helpers through useToast', () => {
    const plugin = ToastHarness.viaPlugin({ duration: 1000 });

    const service = captureSetup(() => useToast(), {
      plugins: [],
    }).value;

    const id = service.error('Failed', { description: 'Retry later' });
    expect(service).toBeTruthy();

    expect(ToastHarness.shared().record(id)).toMatchObject({
      tone: ToastTone.Error,
      description: 'Retry later',
    });

    expect(plugin.ids).toEqual([]);
  });

  it('gives each app its own store, shares one without the plugin and scopes via provideNuiConfig', () => {
    const first = ToastHarness.viaPlugin();
    const second = ToastHarness.viaPlugin();
    expect(first.store).not.toBe(second.store);
    expect(ToastHarness.shared().store).toBe(ToastHarness.shared().store);

    const scoped = ToastHarness.scoped({ duration: 10 });
    expect(scoped.store).not.toBe(ToastHarness.shared().store);

    scoped.show({ title: 'Scoped' });
    scoped.advance(10);
    expect(scoped.leavingIds).toEqual(['nui-toast-1']);
  });
});
