import { describe, expect, it } from 'vite-plus/test';
import {
  UtilityException,
  declarationsOf,
  exceptionOf,
  utilityFindings,
} from './utility-guards.mjs';

const css = (path, source) => ({ path, source });

const rule = (body) => `@layer components {\n  .nui-part {\n${body}\n  }\n}\n`;

const categoryOf = (property, value, source = '') =>
  exceptionOf({ property, value, selector: '.nui-part', index: 0 }, source);

describe('utility guards of check:styles', () => {
  it('reads declarations with their rule and skips @apply, comments and strings', () => {
    const source = [
      '.nui-part {',
      '  /* color: red; */',
      '  @apply flex gap-2;',
      "  content: '{ a; b }';",
      '  &:hover { opacity: 0.5 }',
      '  @starting-style { opacity: 0; }',
      '}',
    ].join('\n');

    expect(
      declarationsOf(source).map(({ property, value, selector }) => [selector, property, value]),
    ).toEqual([
      ['.nui-part', 'content', "'{ a; b }'"],
      ['&:hover', 'opacity', '0.5'],
      ['.nui-part', 'opacity', '0'],
    ]);
  });

  it('leaves out the bodies of keyframes, properties, theme blocks and utility definitions', () => {
    const source = [
      '@keyframes nui-spin { to { rotate: 1turn; } }',
      '@property --_x { syntax: "<length>"; inherits: false; initial-value: 0px; }',
      '@theme static { --spacing-icon: 1rem; }',
      '@utility inline-icon { inline-size: var(--spacing-icon); }',
    ].join('\n');

    expect(declarationsOf(source)).toEqual([]);
  });

  it('reports a declaration that a standard or an arbitrary utility writes', () => {
    const sheet = css(
      'kit.css',
      rule(
        [
          '    display: flex;',
          '    padding: 1px 2px;',
          '    inline-size: 50%;',
          '    transition: opacity 1s;',
          '    border: 1px solid red;',
          '    border: 1px solid color-mix(in oklab, red 50%, transparent);',
          '    scrollbar-gutter: stable;',
          '    filter: drop-shadow(0 0 1px red);',
          '    grid-area: 1 / 1;',
        ].join('\n'),
      ),
    );

    expect(utilityFindings([sheet])).toEqual([
      'kit.css:3: .nui-part { display: flex }',
      'kit.css:4: .nui-part { padding: 1px 2px }',
      'kit.css:5: .nui-part { inline-size: 50% }',
      'kit.css:6: .nui-part { transition: opacity 1s }',
      'kit.css:7: .nui-part { border: 1px solid red }',
      'kit.css:8: .nui-part { border: 1px solid color-mix(in oklab, red 50%, transparent) }',
      'kit.css:9: .nui-part { scrollbar-gutter: stable }',
      'kit.css:10: .nui-part { filter: drop-shadow(0 0 1px red) }',
      'kit.css:11: .nui-part { grid-area: 1 / 1 }',
    ]);
  });

  it('keeps custom properties, mixed colours and properties without a utility', () => {
    expect(categoryOf('--_tone', 'var(--color-primary)')).toBe(UtilityException.CustomProperty);

    expect(categoryOf('background', 'color-mix(in oklab, red 12%, transparent)')).toBe(
      UtilityException.MixedColour,
    );

    expect(categoryOf('color', 'oklab(from var(--x) calc(l - 0.1) a b)')).toBe(
      UtilityException.MixedColour,
    );

    expect(categoryOf('font', 'inherit')).toBe(UtilityException.NoUtility);

    expect(categoryOf('clip-path', 'inset(50%)')).toBe(UtilityException.NoUtility);

    expect(categoryOf('animation-play-state', 'var(--nui-animation-play-state, running)')).toBe(
      UtilityException.NoUtility,
    );
  });

  it('keeps values that the utilities of a property cannot write', () => {
    expect(categoryOf('text-transform', 'var(--caption-transform)')).toBe(
      UtilityException.KeywordOnly,
    );

    expect(categoryOf('text-align', 'inherit')).toBe(UtilityException.KeywordOnly);

    expect(categoryOf('text-align', 'start')).toBeUndefined();

    expect(categoryOf('translate', 'var(--_shift)')).toBe(UtilityException.WholeVariable);

    expect(categoryOf('box-shadow', 'var(--_lift, none)')).toBe(UtilityException.ShadowVariable);

    expect(categoryOf('grid-area', 'leading')).toBeUndefined();

    expect(categoryOf('grid-area', 'auto')).toBeUndefined();
  });

  it('reports transition lists, which escaped names and transition-discrete express, and keeps layered images', () => {
    expect(categoryOf('transition', '--_fade-start 1s ease, --_fade-end 1s ease')).toBeUndefined();

    expect(categoryOf('transition', 'opacity 1s ease, display 1s allow-discrete')).toBeUndefined();

    expect(categoryOf('background', 'linear-gradient(red, red) top / 100% 1px no-repeat')).toBe(
      UtilityException.LayeredImage,
    );

    expect(
      categoryOf('mask', 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'),
    ).toBe(UtilityException.LayeredImage);
  });

  it('keeps the values whose utilities write another value or another property too', () => {
    expect(categoryOf('justify-self', 'end')).toBe(UtilityException.FlexAlignment);

    expect(categoryOf('justify-self', 'center')).toBeUndefined();

    expect(categoryOf('border-block-end-width', '0')).toBe(UtilityException.WidthSetsStyle);

    expect(categoryOf('transition-property', 'background-color, opacity')).toBe(
      UtilityException.TransitionProperty,
    );
  });

  it('keeps border and outline resets and side styles next to a style setter', () => {
    const setter = '.nui-part--dashed { @apply border-dashed; }';

    expect(categoryOf('border', '0')).toBe(UtilityException.BorderReset);

    expect(categoryOf('border-inline-end', '0')).toBe(UtilityException.BorderReset);

    expect(categoryOf('outline', 'none')).toBe(UtilityException.OutlineReset);

    expect(categoryOf('border-inline-start', '3px solid red', setter)).toBe(
      UtilityException.SideStyle,
    );

    expect(categoryOf('border-inline-start', '3px solid red')).toBeUndefined();
  });

  it('keeps the geometry an engine sets in its special zone', () => {
    const caret = { property: 'inset-block-start', value: '0', index: 0 };

    expect(exceptionOf({ ...caret, selector: '.nui-collab-carets__caret' }, '')).toBe(
      UtilityException.EngineGeometry,
    );

    expect(exceptionOf({ ...caret, selector: '.nui-collab-carets__label' }, '')).toBeUndefined();
  });
});
