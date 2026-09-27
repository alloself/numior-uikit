import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useHotkey } from '../src';
import { captureSetup } from './harness/capture';

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}): boolean => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

  target.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('useHotkey', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('runs the handler for the combo with either mod key, on any keyboard layout and inside inputs', () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    const capture = captureSetup(() => useHotkey('mod+k', handler));
    expect(press(window, 'k', { ctrlKey: true })).toBe(true);
    expect(press(window, 'K', { metaKey: true })).toBe(true);
    expect(press(window, 'л', { ctrlKey: true, code: 'KeyK' })).toBe(true);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(press(window, 'k', { ctrlKey: true, altKey: true })).toBe(false);
    expect(press(window, 'k')).toBe(false);
    expect(press(window, 'j', { ctrlKey: true })).toBe(false);
    expect(press(window, 'л', { ctrlKey: true, code: 'KeyL' })).toBe(false);
    const input = document.createElement('input');
    document.body.append(input);
    expect(press(input, 'k', { ctrlKey: true })).toBe(true);
    expect(handler).toHaveBeenCalledTimes(4);
    capture.wrapper.unmount();
    expect(press(window, 'k', { ctrlKey: true })).toBe(false);
  });

  it('keeps a bare key out of editable targets unless asked', () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    captureSetup(() => useHotkey('/', handler));
    const input = document.createElement('input');
    document.body.append(input);
    expect(press(input, '/')).toBe(false);
    expect(press(window, '/')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('honours enabled, key aliases, a custom target and exact modifiers', () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    const enabled = ref(false);
    const target = document.createElement('div');
    document.body.append(target);

    captureSetup(() => useHotkey('shift+esc', handler, { enabled, target, preventDefault: false }));

    expect(press(target, 'Escape', { shiftKey: true })).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    enabled.value = true;
    expect(press(target, 'Escape', { shiftKey: true })).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    press(target, 'Escape');
    press(target, 'Escape', { shiftKey: true, ctrlKey: true });
    press(window, 'Escape', { shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('lets a combo run inside editable targets when asked', () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    captureSetup(() => useHotkey('ctrl+enter', handler, { inEditable: true }));
    const textarea = document.createElement('textarea');
    document.body.append(textarea);
    expect(press(textarea, 'Enter', { ctrlKey: true })).toBe(true);
    expect(press(textarea, 'Enter', { metaKey: true })).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
