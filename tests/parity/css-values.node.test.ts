import { describe, expect, it } from 'vite-plus/test';
import {
  canonical,
  evaluate,
  gridAlignment,
  isGridDisplay,
  longhands,
  normalized,
  splitTokens,
} from './css-values';
import type { CssEnvironment } from './css-rules.types';

const ENVIRONMENT: CssEnvironment = {
  aliases: new Map([['--nui-radius', 'var(--radius-md)']]),
  fixed: new Map([['--spacing', '0.25rem']]),
  helpers: new Map(),
};

describe('values of a compiled declaration', () => {
  it('writes values in one form', () => {
    expect(canonical("var(--nui-radius) .5rem 'x' a ,b", ENVIRONMENT.aliases)).toBe(
      'var(--radius-md) 0.5rem "x" a, b',
    );

    expect(canonical('currentColor CurrentColor currentcolor', ENVIRONMENT.aliases)).toBe(
      'currentcolor currentcolor currentcolor',
    );
  });

  it('works out the arithmetic of the spacing scale and leaves the rest alone', () => {
    expect(evaluate('calc(0.25rem * 2)')).toBe('0.5rem');
    expect(evaluate('calc(0.25rem - calc(0.25rem * 2))')).toBe('-0.25rem');
    expect(evaluate('calc(calc(1 / 2 * 100%) * -1)')).toBe('-50%');
    expect(evaluate('calc(1rem / 4)')).toBe('0.25rem');
    expect(evaluate('calc(100% - 2px)')).toBe('calc(100% - 2px)');
    expect(evaluate('calc(1rem * 1rem)')).toBe('calc(1rem * 1rem)');
    expect(evaluate('calc(4 / 1rem)')).toBe('calc(4 / 1rem)');
  });

  it('resolves fixed keys and writes every zero length as 0', () => {
    const margin = normalized('min(15dvh, calc(var(--spacing) * 8))', ENVIRONMENT);

    expect(normalized('calc(var(--spacing) * 0) 0rem -0px', ENVIRONMENT)).toBe('0 0 0');
    expect(margin).toBe('min(15dvh, 2rem)');
  });

  it('writes a track repeated once as the track itself', () => {
    expect(normalized('repeat(1, minmax(0, 1fr))', ENVIRONMENT)).toBe('minmax(0, 1fr)');

    expect(normalized('repeat(1, 2rem) repeat(2, 1fr) repeat(1,auto)', ENVIRONMENT)).toBe(
      '2rem repeat(2, 1fr) auto',
    );
  });

  it('takes flex-start for start only in the alignment of a grid', () => {
    expect(gridAlignment('align-content', 'flex-start')).toBe('start');
    expect(gridAlignment('align-items', 'safe flex-start')).toBe('safe start');
    expect(gridAlignment('align-self', 'flex-start')).toBe('flex-start');

    expect([isGridDisplay('inline-grid'), isGridDisplay('flex'), isGridDisplay(undefined)]).toEqual(
      [true, false, false],
    );
  });

  it('splits a value at the spaces outside functions', () => {
    expect(splitTokens('1px  solid color-mix(in oklab, red 50%, blue)')).toEqual([
      '1px',
      'solid',
      'color-mix(in oklab, red 50%, blue)',
    ]);
  });
});

describe('longhands of a declaration', () => {
  it('spreads a border over the four sides with logical names where both sides match', () => {
    expect(longhands('border', '1px solid red')).toEqual([
      ['border-block-start-width', '1px'],
      ['border-block-end-width', '1px'],
      ['border-inline-start-width', '1px'],
      ['border-inline-end-width', '1px'],
      ['border-block-start-style', 'solid'],
      ['border-block-end-style', 'solid'],
      ['border-inline-start-style', 'solid'],
      ['border-inline-end-style', 'solid'],
      ['border-block-start-color', 'red'],
      ['border-block-end-color', 'red'],
      ['border-inline-start-color', 'red'],
      ['border-inline-end-color', 'red'],
    ]);

    expect(longhands('border-top', '0')).toEqual([
      ['border-block-start-width', '0'],
      ['border-block-start-style', 'none'],
      ['border-block-start-color', 'currentcolor'],
    ]);

    expect(longhands('border-inline', 'thin dashed')).toEqual([
      ['border-inline-start-width', 'thin'],
      ['border-inline-start-style', 'dashed'],
      ['border-inline-start-color', 'currentcolor'],
      ['border-inline-end-width', 'thin'],
      ['border-inline-end-style', 'dashed'],
      ['border-inline-end-color', 'currentcolor'],
    ]);
  });

  it('keeps physical sides that differ', () => {
    expect(longhands('padding', '1px 2px 3px 4px')).toEqual([
      ['padding-block-start', '1px'],
      ['padding-block-end', '3px'],
      ['padding-right', '2px'],
      ['padding-left', '4px'],
    ]);

    expect(longhands('inset', '0')).toEqual([
      ['inset-block-start', '0'],
      ['inset-block-end', '0'],
      ['inset-inline-start', '0'],
      ['inset-inline-end', '0'],
    ]);

    expect(longhands('margin-top', '1px')).toEqual([['margin-block-start', '1px']]);
    expect(longhands('bottom', '1px')).toEqual([['inset-block-end', '1px']]);

    expect(longhands('padding-inline', '1px 2px')).toEqual([
      ['padding-inline-start', '1px'],
      ['padding-inline-end', '2px'],
    ]);
  });

  it('reads the side longhands of a border', () => {
    expect(longhands('border-color', 'red blue')).toEqual([
      ['border-block-start-color', 'red'],
      ['border-block-end-color', 'red'],
      ['border-inline-start-color', 'blue'],
      ['border-inline-end-color', 'blue'],
    ]);

    expect(longhands('border-bottom-width', '2px')).toEqual([['border-block-end-width', '2px']]);

    expect(longhands('border-block-style', 'solid none')).toEqual([
      ['border-block-start-style', 'solid'],
      ['border-block-end-style', 'none'],
    ]);
  });

  it('marks what a shorthand resets', () => {
    expect(longhands('background', 'none').slice(0, 3)).toEqual([
      ['background-color', 'transparent'],
      ['background-image', 'none'],
      ['background-position-x', 'initial'],
    ]);

    expect(longhands('background', 'url(x) red')).toEqual([['background', 'url(x) red']]);
    expect(longhands('text-decoration', 'none')[0]).toEqual(['text-decoration-line', 'none']);

    expect(longhands('text-decoration', 'underline 2px')).toEqual([
      ['text-decoration', 'underline 2px'],
    ]);

    expect(longhands('list-style', 'none')).toEqual([
      ['list-style-type', 'none'],
      ['list-style-position', 'initial'],
      ['list-style-image', 'initial'],
    ]);

    expect(longhands('list-style', 'disc inside')).toEqual([['list-style', 'disc inside']]);

    expect(longhands('outline', 'none')).toEqual([
      ['outline-width', 'medium'],
      ['outline-style', 'none'],
      ['outline-color', 'currentcolor'],
    ]);
  });

  it('spreads a transition list into columns', () => {
    expect(
      longhands('transition', 'opacity var(--duration) var(--ease), display 1s allow-discrete'),
    ).toEqual([
      ['transition-property', 'opacity, display'],
      ['transition-duration', 'var(--duration), 1s'],
      ['transition-timing-function', 'var(--ease), ease'],
      ['transition-delay', 'initial'],
      ['transition-behavior', 'normal, allow-discrete'],
    ]);

    expect(longhands('transition', 'color 1s linear 2s')).toEqual([
      ['transition-property', 'color'],
      ['transition-duration', '1s'],
      ['transition-timing-function', 'linear'],
      ['transition-delay', '2s'],
      ['transition-behavior', 'initial'],
    ]);
  });

  it('writes keyword and percent forms like the computed value', () => {
    expect(longhands('flex', 'auto')).toEqual([['flex', '1 1 auto']]);
    expect(longhands('flex', '0 auto')).toEqual([['flex', '0 1 auto']]);
    expect(longhands('opacity', '72%')).toEqual([['opacity', '0.72']]);
    expect(longhands('opacity', 'var(--x)')).toEqual([['opacity', 'var(--x)']]);
    expect(longhands('-webkit-user-select', 'none')).toEqual([['user-select', 'none']]);

    expect(longhands('overflow', 'hidden auto')).toEqual([
      ['overflow-x', 'hidden'],
      ['overflow-y', 'auto'],
    ]);
  });
});
