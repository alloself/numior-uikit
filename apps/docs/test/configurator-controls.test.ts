import { describe, expect, it } from 'vite-plus/test';
import { fitsSegments } from '../.vitepress/theme/configurator-controls';

describe('configurator enum control', () => {
  it('shows a few short values as segments', () => {
    expect(fitsSegments(['sm', 'md', 'lg', 'xl'])).toBe(true);
    expect(fitsSegments(['horizontal', 'vertical'])).toBe(true);
    expect(fitsSegments(['solid', 'soft', 'outline'])).toBe(true);
  });

  it('leaves many values or long names to a select so the group fits its cell', () => {
    expect(fitsSegments(['xs', 'sm', 'md', 'lg', 'xl'])).toBe(false);
    expect(fitsSegments(['start', 'end', 'top', 'bottom'])).toBe(false);
    expect(fitsSegments(['plain', 'divided', 'bordered'])).toBe(false);
  });
});
