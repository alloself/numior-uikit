import { describe, expect, it } from 'vite-plus/test';
import { SplitAttrsHarness } from './harness/split-attrs';

describe('useSplitAttrs', () => {
  it('routes class and style to the wrapper and the rest to the control', async () => {
    const harness = new SplitAttrsHarness();
    expect(harness.root.classes()).toContain('wide');
    expect(harness.root.attributes('style')).toContain('color: red');
    expect(harness.control.attributes('placeholder')).toBe('Name');
    expect(harness.control.attributes('aria-label')).toBe('Name');
    expect(harness.control.attributes('class')).toBeUndefined();
    await harness.focusControl();
    expect(harness.focusCount.value).toBe(1);
    await harness.renamePlaceholder('Full name');
    expect(harness.control.attributes('placeholder')).toBe('Full name');
  });
});
