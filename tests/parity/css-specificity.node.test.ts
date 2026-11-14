import { describe, expect, it } from 'vite-plus/test';
import { compareSpecificity, listSpecificity, specificity } from './css-specificity';

describe('selector specificity', () => {
  it('counts ids, classes and types', () => {
    expect(specificity('#menu a.nui-link::before')).toEqual([1, 1, 2]);
    expect(specificity('.nui-dialog[open]')).toEqual([0, 2, 0]);
    expect(specificity('.nui-list > :first-child')).toEqual([0, 2, 0]);
    expect(specificity('*')).toEqual([0, 0, 0]);
  });

  it('takes the strongest argument of :not, :is and :has and nothing of :where', () => {
    expect(specificity('.nui-button:hover:not(:disabled, .nui-button--loading)')).toEqual([
      0, 3, 0,
    ]);

    expect(specificity(':where(.nui-theme--dark) .nui-card')).toEqual([0, 1, 0]);
    expect(specificity('.a:is(.b, #c)')).toEqual([1, 1, 0]);
    expect(specificity('li:nth-child(2n + 1)')).toEqual([0, 1, 1]);
  });

  it('weighs every selector of a list and orders the results', () => {
    expect(listSpecificity('.a, .a:hover')).toEqual([
      [0, 1, 0],
      [0, 2, 0],
    ]);

    expect(compareSpecificity([0, 2, 0], [0, 1, 5])).toBeGreaterThan(0);
    expect(compareSpecificity([0, 1, 0], [0, 1, 0])).toBe(0);
  });
});
