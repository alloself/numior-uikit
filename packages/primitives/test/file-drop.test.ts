import { describe, expect, it } from 'vitest';
import { FileDropHarness, fileOf } from './harness/upload';

describe('useFileDrop', () => {
  it('tracks the drag depth across children and hands dropped files over', () => {
    const zone = FileDropHarness.mount();
    expect(zone.enter()).toBe(true);
    expect(zone.dragging).toBe(true);
    zone.enter('.child');
    zone.leave('.child');
    expect(zone.dragging).toBe(true);
    expect(zone.over()).toEqual({ prevented: true, effect: 'copy' });
    zone.leave();
    expect(zone.dragging).toBe(false);
    zone.enter();
    const files = [fileOf('a.txt'), fileOf('b.png', 5, 'image/png')];
    expect(zone.dropFiles(...files)).toBe(true);
    expect(zone.dragging).toBe(false);
    expect(zone.dropped).toEqual([files]);
    zone.unmount();
  });

  it('ignores drags without files and everything while disabled', () => {
    const zone = FileDropHarness.mount();
    expect(zone.enter('.zone', false)).toBe(false);
    expect(zone.dragging).toBe(false);
    expect(zone.over(false).prevented).toBe(false);
    zone.setDisabled(true);
    expect(zone.enter()).toBe(false);
    expect(zone.dropFiles(fileOf('a.txt'))).toBe(false);
    expect(zone.dropped).toEqual([]);
    zone.unmount();
  });
});
