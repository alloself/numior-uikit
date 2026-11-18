const COMMENT = /\/\*[\s\S]*?\*\//gu;
const SKIPPED_BLOCK = /^@(?:keyframes|property|font-face|theme|utility|custom-variant)\b/u;
const WHOLE_VARIABLE = /^var\(\s*--[\w-]+\s*(?:,[\s\S]*)?\)$/u;
const PRIVATE_VARIABLE = /^var\(\s*--_[\w-]+\s*(?:,[\s\S]*)?\)$/u;
const MIXED_COLOUR = /\bcolor-mix\(|\(\s*from\s/u;
const FLEX_ALIGNED = /^(?:align-items|align-content|align-self|justify-content|justify-self)$/u;
const START_OR_END = /^(?:start|end)$/u;
const SIDE = '(?:(?:block|inline)(?:-(?:start|end))?|top|right|bottom|left)';
const BORDER_SHORTHAND = new RegExp(`^border(?:-${SIDE})?$`, 'u');
const SIDE_SHORTHAND = new RegExp(`^border-${SIDE}$`, 'u');
const BORDER_WIDTH = new RegExp(`^border(?:-${SIDE})?-width$`, 'u');
const ZERO_RESET = /^(?:0(?:px)?|none)(?:\s+none)?$/u;

const STYLE_KEYWORD =
  /(?:^|\s)(?:solid|dashed|dotted|double|groove|ridge|inset|outset|hidden)(?:\s|$)/u;

const LAYERED = new Set(['background', 'mask']);

const STYLE_SETTER =
  /@apply[^;]*[\s:]border(?:-(?:x|y|s|e|bs|be|t|r|b|l))?-(?:none|hidden|dashed|dotted|double)(?=[\s;])/u;

export const UtilityException = Object.freeze({
  CustomProperty: 'custom-property',
  MixedColour: 'mixed-colour',
  NoUtility: 'no-utility',
  KeywordOnly: 'keyword-only',
  WholeVariable: 'whole-variable',
  ShadowVariable: 'shadow-variable',
  LayeredImage: 'layered-image',
  FlexAlignment: 'flex-alignment',
  WidthSetsStyle: 'width-sets-style',
  TransitionProperty: 'transition-property',
  EngineGeometry: 'engine-geometry',
  BorderReset: 'border-reset',
  OutlineReset: 'outline-reset',
  SideStyle: 'side-style',
});

const NO_UTILITY = new Set([
  'font',
  'clip-path',
  'grid-template-areas',
  'unicode-bidi',
  'direction',
  'counter-reset',
  'counter-increment',
  'content-visibility',
  'overflow-anchor',
  'animation-play-state',
  'animation-duration',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-timing-function',
  '-webkit-text-fill-color',
  'shape-rendering',
  'stroke-linejoin',
  'stroke-linecap',
  'stroke-dasharray',
  'fill-opacity',
  'anchor-name',
  'anchor-scope',
  'position-anchor',
  'position-visibility',
  'view-timeline',
  'animation-timeline',
  'animation-range',
]);

const KEYWORDS = new Map([
  ['text-transform', /^(?:uppercase|lowercase|capitalize|none)$/u],
  ['float', /^(?:left|right|inline-start|inline-end|start|end|none)$/u],
  ['position', /^(?:static|relative|absolute|fixed|sticky)$/u],
  ['text-align', /^(?:left|center|right|justify|start|end)$/u],
  ['overscroll-behavior', /^(?:auto|contain|none)$/u],
  [
    'justify-content',
    /^(?:normal|start|end|center|space-between|space-around|space-evenly|stretch|flex-start|flex-end|baseline)$/u,
  ],
]);

const WHOLE_VARIABLE_SHORTHANDS = new Set(['translate', 'grid-area', 'outline', 'background']);

const ENGINE_GEOMETRY = [
  [/\.nui-table__viewport::(?:before|after)/u, /^block-size$/u],
  [/\.nui-table__viewport > \.nui-table__grid(?![\w-])/u, /^(?:position|inset(?:-.*)?)$/u],
  [
    /\.nui-spreadsheet__(?:ref|fill|fill-preview|fill-clear|drawing|drawing-frame|anchor|lit|editor)(?![\w-])/u,
    /^(?:position|inset(?:-.*)?|inline-size|block-size|translate)$/u,
  ],
  [
    /\.nui-editor__(?:range|anchor|drop|ghost|gap)(?![\w-])|\.nui-editor-handle(?![\w-])/u,
    /^(?:position|inset(?:-.*)?|inline-size|block-size|translate|transform)$/u,
  ],
  [
    /\.nui-collab-carets(?:__caret|__flag)?(?![\w-])|\.nui-collab-comment-layer(?:__range|__anchor)?(?![\w-])/u,
    /^(?:position|inset(?:-.*)?|inline-size|block-size|translate|transform)$/u,
  ],
];

const PAREN_STEP = new Map([
  ['(', 1],
  [')', -1],
]);

const blank = (text) => text.replace(/[^\n]/gu, ' ');

const squash = (text) => text.replace(/\s+/gu, ' ').trim();

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const skipped = (stack) => stack.some((prelude) => SKIPPED_BLOCK.test(prelude));

const declarationOf = (statement, offset, stack) => {
  const text = statement.trim();
  const colon = text.indexOf(':');

  if (text === '' || text.startsWith('@') || colon < 0 || skipped(stack)) {
    return undefined;
  }

  return {
    property: text.slice(0, colon).trim().toLowerCase(),
    value: squash(text.slice(colon + 1)),
    selector: squash(stack.findLast((prelude) => !prelude.startsWith('@')) ?? ''),
    index: offset + statement.indexOf(text),
  };
};

const quoteStep = (quote, char) => {
  if (quote !== '') {
    return char === quote ? '' : quote;
  }

  return char === '"' || char === "'" ? char : '';
};

const BOUNDARIES = new Set(['{', '}', ';']);

const STACK_STEPS = new Map([
  ['{', (stack, statement) => stack.push(squash(statement))],
  ['}', (stack) => stack.pop()],
]);

const boundary = (scan, char) => {
  const quoted = scan.quote !== '' || char === '"' || char === "'";

  scan.quote = quoteStep(scan.quote, char);
  scan.depth += quoted ? 0 : (PAREN_STEP.get(char) ?? 0);

  return !quoted && scan.depth === 0 && BOUNDARIES.has(char);
};

const closeStatement = (scan, text, at, char) => {
  const statement = text.slice(scan.start, at);
  const declaration = char === '{' ? undefined : declarationOf(statement, scan.start, scan.stack);

  if (declaration !== undefined) {
    scan.found.push(declaration);
  }

  STACK_STEPS.get(char)?.(scan.stack, statement);
  scan.start = at + 1;
};

export const declarationsOf = (source) => {
  const text = source.replace(COMMENT, blank);
  const scan = { stack: [], found: [], start: 0, depth: 0, quote: '' };

  for (const [at, char] of [...text].entries()) {
    if (!boundary(scan, char)) {
      continue;
    }

    closeStatement(scan, text, at, char);
  }

  return scan.found;
};

const topLevelParts = (value, separator) => {
  let depth = 0;

  return [...value].reduce(
    (parts, char) => {
      depth += PAREN_STEP.get(char) ?? 0;

      if (char === separator && depth === 0) {
        parts.push('');

        return parts;
      }

      parts[parts.length - 1] += char;

      return parts;
    },
    [''],
  );
};

const layeredImage = (value) =>
  topLevelParts(value, ',').length > 1 || topLevelParts(value.trim(), ' ').length > 1;

const borderShorthand = (property) => BORDER_SHORTHAND.test(property) || property === 'outline';

const engineGeometry = ({ selector, property }) =>
  ENGINE_GEOMETRY.some(([rule, properties]) => rule.test(selector) && properties.test(property));

const shapeException = ({ property, value }) => {
  const keywords = KEYWORDS.get(property);
  const whole = WHOLE_VARIABLE.test(value);

  if (keywords !== undefined && !keywords.test(value)) {
    return UtilityException.KeywordOnly;
  }

  if (whole && (WHOLE_VARIABLE_SHORTHANDS.has(property) || BORDER_SHORTHAND.test(property))) {
    return UtilityException.WholeVariable;
  }

  return property === 'box-shadow' && PRIVATE_VARIABLE.test(value)
    ? UtilityException.ShadowVariable
    : undefined;
};

const listException = ({ property, value }) =>
  LAYERED.has(property) && layeredImage(value) ? UtilityException.LayeredImage : undefined;

const writeException = ({ property, value }) => {
  if (FLEX_ALIGNED.test(property) && START_OR_END.test(value)) {
    return UtilityException.FlexAlignment;
  }

  if (BORDER_WIDTH.test(property)) {
    return UtilityException.WidthSetsStyle;
  }

  return property === 'transition-property' ? UtilityException.TransitionProperty : undefined;
};

const resetException = ({ property, value }, source) => {
  if (BORDER_SHORTHAND.test(property) && ZERO_RESET.test(value)) {
    return UtilityException.BorderReset;
  }

  if (property === 'outline' && ZERO_RESET.test(value)) {
    return UtilityException.OutlineReset;
  }

  const sideStyle = SIDE_SHORTHAND.test(property) && STYLE_KEYWORD.test(value);

  return sideStyle && STYLE_SETTER.test(source) ? UtilityException.SideStyle : undefined;
};

export const exceptionOf = (declaration, source) => {
  if (declaration.property.startsWith('--')) {
    return UtilityException.CustomProperty;
  }

  if (MIXED_COLOUR.test(declaration.value) && !borderShorthand(declaration.property)) {
    return UtilityException.MixedColour;
  }

  if (NO_UTILITY.has(declaration.property)) {
    return UtilityException.NoUtility;
  }

  if (engineGeometry(declaration)) {
    return UtilityException.EngineGeometry;
  }

  return (
    shapeException(declaration) ??
    listException(declaration) ??
    writeException(declaration) ??
    resetException(declaration, source)
  );
};

export const utilityFindings = (files) =>
  files.flatMap((file) => {
    const source = file.source.replace(COMMENT, blank);

    return declarationsOf(file.source).reduce((found, declaration) => {
      if (exceptionOf(declaration, source) !== undefined) {
        return found;
      }

      found.push(
        `${file.path}:${lineOf(file.source, declaration.index)}: ${declaration.selector} { ${declaration.property}: ${declaration.value} }`,
      );

      return found;
    }, []);
  });
