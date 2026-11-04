import { describe, expect, it } from 'vite-plus/test';
import { SkeletonDriver } from './drivers/skeleton';

describe('NuiSkeleton', () => {
  it('renders decorative text lines by default', () => {
    const skeleton = SkeletonDriver.mount({ lines: 3 });
    expect(skeleton.hidden).toBe(true);
    expect(skeleton.hasModifier('shape-text')).toBe(true);
    expect(skeleton.lines).toBe(3);
    expect(skeleton.hasModifier('static')).toBe(false);
  });

  it('supports shapes, custom sizes and a static mode', () => {
    const circle = SkeletonDriver.mount({ shape: 'circle', width: '3rem', height: '3rem' });
    expect(circle.hasModifier('shape-circle')).toBe(true);
    expect(circle.lines).toBe(0);
    expect(circle.inlineStyle).toContain('--_inline-size: 3rem');
    expect(circle.inlineStyle).toContain('--_block-size: 3rem');

    const rect = SkeletonDriver.mount({ shape: 'rect', animated: false });
    expect(rect.hasModifier('static')).toBe(true);
  });
});
