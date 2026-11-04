import { describe, expect, it } from 'vite-plus/test';
import { ProgressDriver } from './drivers/progress';

describe('NuiProgress', () => {
  it('is a native progress element with value, max and accessible text', async () => {
    const progress = ProgressDriver.mount({
      value: 40,
      max: 200,
      label: 'Upload',
      valueText: '40 of 200 files',
      size: 'lg',
      tone: 'success',
    });

    expect(progress.element.tagName).toBe('PROGRESS');
    expect(progress.valueAttribute).toBe('40');
    expect(progress.maxAttribute).toBe('200');
    expect(progress.attribute('aria-label')).toBe('Upload');
    expect(progress.attribute('aria-valuetext')).toBe('40 of 200 files');
    expect(progress.hasModifier('size-lg')).toBe(true);
    expect(progress.hasModifier('tone-success')).toBe(true);
    expect(progress.hasModifier('indeterminate')).toBe(false);

    await progress.receive({ value: 120 });
    expect(progress.valueAttribute).toBe('120');
  });

  it('omits the value for indeterminate progress', () => {
    const progress = ProgressDriver.mount({ label: 'Loading' });
    expect(progress.valueAttribute).toBeUndefined();
    expect(progress.maxAttribute).toBe('100');
    expect(progress.hasModifier('indeterminate')).toBe(true);
  });
});
