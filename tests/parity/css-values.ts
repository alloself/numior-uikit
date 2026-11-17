import type { Aliases, CssEnvironment, Longhand, SideNames } from './css-rules.types.ts';

const HELPER = /var\((--tw-[a-z-]+)(?:,\s*((?:[^()]|\((?:[^()]|\([^()]*\))*\))*))?\)/g;
const ALIAS = /var\((--nui-[a-z0-9-]+)\)/g;
const KEY = /var\((--[a-z0-9-]+)\)/g;
const INNER_CALC = /calc\(([^()]*)\)/g;
const TERM = /^(-?\d*\.?\d+)([a-z%]*)$/;
const ZERO_LENGTH = /(^|[\s(,])-?0(?:\.0+)?(?:px|rem|em)?(?=$|[\s),])/g;

const BORDER_SIDE =
  /^border-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)$/;

const LOGICAL = new Map([
  ['top', 'block-start'],
  ['bottom', 'block-end'],
]);

const STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);

const LINES = new Set(['none', 'underline', 'overline', 'line-through']);

const BACKGROUND_RESETS = [
  'background-position-x',
  'background-position-y',
  'background-size',
  'background-repeat',
  'background-origin',
  'background-clip',
  'background-attachment',
];

const FLEX = new Map([
  ['auto', '1 1 auto'],
  ['none', '0 0 auto'],
  ['initial', '0 1 auto'],
  ['0 auto', '0 1 auto'],
]);

const REPEAT_OPEN = 'repeat(';
const GRID_DISPLAYS = new Set(['grid', 'inline-grid']);

const GRID_ALIGNMENTS = new Set([
  'align-content',
  'justify-content',
  'align-items',
  'justify-items',
]);

export const RESET = 'initial';

const TIMING_LISTS = new Set([
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'transition-behavior',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-play-state',
  'animation-composition',
]);

const ZERO = /^-?0(?:\.0+)?(?:px|%)?$/;

const INITIAL_VALUES: readonly (readonly [RegExp, string])[] = [
  [/^border-[a-z-]+-width$/, 'medium'],
  [/^border-[a-z-]+-style$/, 'none'],
  [/^border-[a-z-]+-color$/, 'currentcolor'],
  [/^outline-width$/, 'medium'],
  [/^outline-style$/, 'none'],
  [/^outline-color$/, 'currentcolor'],
  [/^background-color$/, 'transparent'],
  [/^background-image$/, 'none'],
  [/^background-size$/, 'auto'],
  [/^background-repeat$/, 'repeat'],
  [/^background-origin$/, 'padding-box'],
  [/^background-clip$/, 'border-box'],
  [/^background-attachment$/, 'scroll'],
  [/^background-position-[xy]$/, '0%'],
  [/^text-decoration-style$/, 'solid'],
  [/^text-decoration-color$/, 'currentcolor'],
  [/^text-decoration-thickness$/, 'auto'],
  [/^list-style-position$/, 'outside'],
  [/^list-style-image$/, 'none'],
  [/^transition-delay$/, '0s'],
  [/^transition-behavior$/, 'normal'],
  [/^grid-template-areas$/, 'none'],
];

const initialOf = (property: string): string | undefined =>
  INITIAL_VALUES.find(([pattern]) => pattern.test(property))?.[1];

export const sameAsReset = (property: string, values: readonly string[]): boolean => {
  const [left = '', right = ''] = values;
  const other = left === RESET ? right : left;

  return (left === RESET || right === RESET) && other !== RESET && initialOf(property) === other;
};

const PERCENT = /^(-?[\d.]+)%$/;

const CURRENT_COLOR = /\bcurrentcolor\b/gi;
const RATIO_NUMBER = /^[\d.]+$/;

const closingOf = (value: string, open: number): number => {
  let depth = 0;

  for (let at = open; at < value.length; at += 1) {
    depth += Number(value[at] === '(') - Number(value[at] === ')');

    if (depth === 0) {
      return at;
    }
  }

  return value.length - 1;
};

export const withoutSingleRepeats = (value: string): string => {
  const start = value.indexOf(REPEAT_OPEN);

  if (start < 0) {
    return value;
  }

  const close = closingOf(value, start + REPEAT_OPEN.length - 1);
  const inner = value.slice(start + REPEAT_OPEN.length, close);
  const comma = inner.indexOf(',');
  const single = comma > 0 && inner.slice(0, comma).trim() === '1';
  const own = single ? inner.slice(comma + 1).trim() : value.slice(start, close + 1);

  return `${value.slice(0, start)}${own}${withoutSingleRepeats(value.slice(close + 1))}`;
};

export const isGridDisplay = (display: string | undefined): boolean =>
  GRID_DISPLAYS.has(display ?? '');

export const gridAlignment = (property: string, value: string): string =>
  GRID_ALIGNMENTS.has(property) ? value.replace(/(^|\s)flex-start(?=$|\s)/g, '$1start') : value;

const number = (value: number): string => String(Number(value.toFixed(6)) || 0);

const product = (parts: readonly string[]): string | null => {
  let [total, unit] = [1, ''];

  for (const [at, part] of parts.entries()) {
    if (at % 2 === 1) {
      continue;
    }

    const match = TERM.exec(part);
    const divides = parts[at - 1] === '/';

    if (match === null || (match[2] !== '' && (unit !== '' || divides))) {
      return null;
    }

    unit = unit || (match[2] ?? '');
    total = divides ? total / Number(match[1]) : total * Number(match[1]);
  }

  return `${number(total)}${unit}`;
};

const sum = (parts: readonly string[]): string | null => {
  let [total, unit] = [0, TERM.exec(parts[0] ?? '')?.[2]];

  for (const [at, part] of parts.entries()) {
    if (at % 2 === 1) {
      continue;
    }

    const match = TERM.exec(part);
    const sign = parts[at - 1] === '-' ? -1 : 1;

    if (match === null || match[2] !== unit) {
      return null;
    }

    total += sign * Number(match[1]);
  }

  return `${number(total)}${unit ?? ''}`;
};

const evaluateOnce = (expression: string): string | null => {
  const parts = expression
    .replace(/\s*([*/])\s*/g, ' $1 ')
    .trim()
    .split(/\s+/);

  return /[*/]/.test(expression) ? product(parts) : sum(parts);
};

export const evaluate = (value: string): string => {
  const next = value.replace(INNER_CALC, (whole, expression: string) => {
    return evaluateOnce(expression) ?? whole;
  });

  return next === value ? next : evaluate(next);
};

const replaceKeys = (value: string, pattern: RegExp, keys: Aliases, depth = 0): string => {
  const next = value.replace(pattern, (whole, name: string) => keys.get(name) ?? whole);

  return next === value || depth > 8 ? next : replaceKeys(next, pattern, keys, depth + 1);
};

export const substituteHelpers = (
  value: string,
  local: Aliases,
  helpers: Aliases,
  depth = 0,
): string => {
  const next = value.replace(HELPER, (whole, name: string, fallback: string | undefined) => {
    return local.get(name) ?? helpers.get(name) ?? fallback ?? whole;
  });

  return next === value || depth > 8 ? next : substituteHelpers(next, local, helpers, depth + 1);
};

export const helperReads = (value: string): string[] =>
  Array.from(value.matchAll(HELPER), (match) => match[1] ?? '');

export const canonical = (value: string, aliases: Aliases): string => {
  return replaceKeys(value, ALIAS, aliases)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s(,])0?\.(\d)/g, '$10.$2')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/'/g, '"')
    .replace(/\s*,\s*/g, ', ')
    .replace(CURRENT_COLOR, 'currentcolor');
};

export const normalized = (value: string, environment: CssEnvironment): string => {
  const resolved = replaceKeys(canonical(value, environment.aliases), KEY, environment.fixed);
  const plain = canonical(evaluate(resolved), environment.aliases).replace(ZERO_LENGTH, '$10');

  return withoutSingleRepeats(plain);
};

const split = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let [depth, current] = [0, ''];

  for (const char of value) {
    depth += Number(char === '(') - Number(char === ')');

    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());

  return parts.filter((part) => part !== '');
};

export const splitTokens = (value: string): string[] => split(value, ' ');

const MILLISECONDS = /^(-?[\d.]+)ms$/;

const seconds = (item: string): string => {
  const amount = MILLISECONDS.exec(item)?.[1];

  return amount === undefined ? item : `${number(Number(amount) / 1000)}s`;
};

const uniform = (value: string): string => {
  const items = split(value, ',').map(seconds);
  const [first = value] = items;

  return items.every((item) => item === first) ? first : items.join(', ');
};

const scaleFactor = (token: string): string => {
  const percent = PERCENT.exec(token)?.[1];

  return percent === undefined ? token : number(Number(percent) / 100);
};

const translation = (value: string): string => {
  const [x = '', y, ...rest] = splitTokens(value);

  return y !== undefined && rest.length === 0 && ZERO.test(y) ? x : value;
};

const scaling = (value: string): string => {
  const [x = '', y, ...rest] = splitTokens(value).map(scaleFactor);

  return y !== undefined && rest.length === 0 && x === y
    ? x
    : [x, y, ...rest].filter(Boolean).join(' ');
};

const CLEAR_COLORS = new Set([
  '#0000',
  '#00000000',
  'transparent',
  'rgba(0, 0, 0, 0)',
  'rgb(0 0 0 / 0)',
]);

const inertShadow = (layer: string): boolean =>
  splitTokens(layer).every(
    (token) => token === 'inset' || ZERO.test(token) || CLEAR_COLORS.has(token),
  );

const shadows = (value: string): string => {
  const layers = split(value, ',').filter((layer) => !inertShadow(layer));

  return layers.length === 0 ? 'none' : layers.join(', ');
};

const BORDER_PAINT =
  /^(border-(?:(?:block|inline)-(?:start|end)|top|right|bottom|left))-(?:color|width)$/;

const DECORATION_PARTS = new Set([
  'text-decoration-color',
  'text-decoration-style',
  'text-decoration-thickness',
]);

const HIDDEN_STYLES = new Set(['none', 'hidden']);

const TRANSITION_PARTS = new Set([
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'transition-behavior',
]);

const paintStyleOf = (property: string): string | null => {
  const side = BORDER_PAINT.exec(property)?.[1];

  if (side !== undefined) {
    return `${side}-style`;
  }

  if (property === 'outline-color' || property === 'outline-width') {
    return 'outline-style';
  }

  if (TRANSITION_PARTS.has(property)) {
    return 'transition-property';
  }

  return DECORATION_PARTS.has(property) ? 'text-decoration-line' : null;
};

export const unpainted = (property: string, values: ReadonlyMap<string, string>): boolean => {
  const style = paintStyleOf(property);

  return style !== null && HIDDEN_STYLES.has(values.get(style) ?? '');
};

const INTERPOLATED = new Set([
  'opacity',
  'translate',
  'scale',
  'rotate',
  'transform',
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'box-shadow',
  'filter',
  'inline-size',
  'block-size',
  'width',
  'height',
]);

export const discreteBehavior = (properties: string, behavior: string): string => {
  if (behavior === RESET) {
    return RESET;
  }

  const names = split(properties, ',');
  const flags = split(behavior, ',');

  const items = names.map((name, at) =>
    INTERPOLATED.has(name) ? 'normal' : (flags[at % Math.max(flags.length, 1)] ?? 'normal'),
  );

  const [first = 'normal'] = items;

  return items.every((item) => item === first) ? first : items.join(', ');
};

export const canonicalLonghand = (property: string, value: string): string => {
  if (TIMING_LISTS.has(property)) {
    return uniform(value);
  }

  if (property === 'translate') {
    return translation(value);
  }

  if (property === 'box-shadow') {
    return shadows(value);
  }

  if (property === 'border-spacing') {
    return scaling(value);
  }

  return property === 'scale' ? scaling(value) : value;
};

const sideNames = (family: string, suffix: string): SideNames => {
  if (family === 'inset') {
    return {
      top: 'inset-block-start',
      bottom: 'inset-block-end',
      start: 'inset-inline-start',
      end: 'inset-inline-end',
      right: 'right',
      left: 'left',
    };
  }

  return {
    top: `${family}-block-start${suffix}`,
    bottom: `${family}-block-end${suffix}`,
    start: `${family}-inline-start${suffix}`,
    end: `${family}-inline-end${suffix}`,
    right: `${family}-right${suffix}`,
    left: `${family}-left${suffix}`,
  };
};

const fourSides = (names: SideNames, tokens: readonly string[]): Longhand[] => {
  const [top = '', right = top, bottom = top, left = right] = tokens;

  const block: Longhand[] = [
    [names.top, top],
    [names.bottom, bottom],
  ];

  return right === left
    ? [...block, [names.start, left], [names.end, right]]
    : [...block, [names.right, right], [names.left, left]];
};

const pair = (start: string, end: string, tokens: readonly string[]): Longhand[] => {
  const [first = '', second = first] = tokens;

  return [
    [start, first],
    [end, second],
  ];
};

const borderParts = (tokens: readonly string[]): [string, string, string] => {
  const at = tokens.findIndex((token) => STYLES.has(token));
  const before = at < 0 ? tokens : tokens.slice(0, at);
  const after = at < 0 ? [] : tokens.slice(at + 1);

  return [
    before.length > 0 ? before.join(' ') : RESET,
    tokens[at] ?? RESET,
    after.length > 0 ? after.join(' ') : RESET,
  ];
};

const borderSide = (side: string, value: string): Longhand[] => {
  const [width, style, color] = borderParts(splitTokens(value));

  return [
    [`border-${side}-width`, width],
    [`border-${side}-style`, style],
    [`border-${side}-color`, color],
  ];
};

const border = (property: string, value: string): Longhand[] | null => {
  const side = BORDER_SIDE.exec(property)?.[1];
  const axis = /^border-(block|inline)$/.exec(property)?.[1];

  if (side !== undefined) {
    return borderSide(LOGICAL.get(side) ?? side, value);
  }

  if (axis !== undefined) {
    return [...borderSide(`${axis}-start`, value), ...borderSide(`${axis}-end`, value)];
  }

  if (property !== 'border') {
    return null;
  }

  return borderParts(splitTokens(value)).flatMap((part, at) => {
    return fourSides(sideNames('border', ['-width', '-style', '-color'][at] ?? ''), [part]);
  });
};

const borderLonghand = (property: string, value: string): Longhand[] | null => {
  const all = /^border-(width|style|color)$/.exec(property)?.[1];
  const side = /^border-(top|bottom)-(width|style|color)$/.exec(property);
  const axis = /^border-(block|inline)-(width|style|color)$/.exec(property);

  if (all !== undefined) {
    return fourSides(sideNames('border', `-${all}`), splitTokens(value));
  }

  if (side !== null) {
    return [[`border-${LOGICAL.get(side[1] ?? '') ?? ''}-${side[2] ?? ''}`, value]];
  }

  if (axis === null) {
    return null;
  }

  const [name, part] = [axis[1] ?? '', axis[2] ?? ''];

  return pair(`border-${name}-start-${part}`, `border-${name}-end-${part}`, splitTokens(value));
};

const box = (property: string, value: string): Longhand[] | null => {
  const family = /^(padding|margin|inset)$/.exec(property)?.[1];

  const axis = /^(padding|margin|inset|scroll-padding|scroll-margin)-(block|inline)$/.exec(
    property,
  );

  const side = /^(padding|margin)-(top|bottom)$/.exec(property);
  const inset = LOGICAL.get(property);

  if (family !== undefined) {
    return fourSides(sideNames(family, ''), splitTokens(value));
  }

  if (axis !== null) {
    const prefix = `${axis[1] ?? ''}-${axis[2] ?? ''}`;

    return pair(`${prefix}-start`, `${prefix}-end`, splitTokens(value));
  }

  if (side !== null) {
    return [[`${side[1] ?? ''}-${LOGICAL.get(side[2] ?? '') ?? ''}`, value]];
  }

  return inset === undefined ? null : [[`inset-${inset}`, value]];
};

const outline = (value: string): Longhand[] => {
  const [width, style, color] = borderParts(splitTokens(value));

  return [
    ['outline-width', width],
    ['outline-style', style],
    ['outline-color', color],
  ];
};

const IMAGE =
  /^(?:(?:repeating-)?(?:linear|radial|conic)-gradient|url|image-set|image|cross-fade)\(/;

const background = (value: string): Longhand[] | null => {
  if (splitTokens(value).length !== 1) {
    return null;
  }

  const resets = BACKGROUND_RESETS.map((name): Longhand => [name, RESET]);

  if (IMAGE.test(value)) {
    return [['background-color', RESET], ['background-image', value], ...resets];
  }

  const none = value === 'none';

  return [
    ['background-color', none ? 'transparent' : value],
    ['background-image', none ? 'none' : RESET],
    ...resets,
  ];
};

const decoration = (value: string): Longhand[] | null => {
  if (!LINES.has(value)) {
    return null;
  }

  return [
    ['text-decoration-line', value],
    ['text-decoration-style', RESET],
    ['text-decoration-color', RESET],
    ['text-decoration-thickness', RESET],
  ];
};

const transitionItem = (item: string): string[] => {
  const tokens = splitTokens(item);
  const times = tokens.filter((token) => /^-?[\d.]+m?s$|duration/.test(token));
  const behavior = tokens.includes('allow-discrete') ? 'allow-discrete' : 'normal';

  const [property = 'all', timing = 'ease'] = tokens.filter((token) => {
    return !times.includes(token) && token !== behavior;
  });

  return [property, times[0] ?? '0s', timing, times[1] ?? '0s', behavior];
};

const transition = (value: string): Longhand[] => {
  const items = split(value, ',').map(transitionItem);
  const column = (at: number): string => items.map((item) => item[at] ?? '').join(', ');
  const [delay, behavior] = [column(3), column(4)];

  return [
    ['transition-property', column(0)],
    ['transition-duration', column(1)],
    ['transition-timing-function', column(2)],
    ['transition-delay', /^0s(, 0s)*$/.test(delay) ? RESET : delay],
    ['transition-behavior', /^normal(, normal)*$/.test(behavior) ? RESET : behavior],
  ];
};

const LIST_TYPES = new Set(['none', 'disc', 'circle', 'square', 'decimal']);

const listStyle = (value: string): Longhand[] | null => {
  if (!LIST_TYPES.has(value)) {
    return null;
  }

  return [
    ['list-style-type', value],
    ['list-style-position', RESET],
    ['list-style-image', RESET],
  ];
};

const overflow = (value: string): Longhand[] => {
  const [x = '', y = x] = splitTokens(value);

  return [
    ['overflow-x', x],
    ['overflow-y', y],
  ];
};

const gap = (value: string): Longhand[] | null => {
  const [row = '', column = row, ...rest] = splitTokens(value);

  if (rest.length > 0) {
    return null;
  }

  return [
    ['row-gap', row],
    ['column-gap', column],
  ];
};

const gridTemplate = (value: string): Longhand[] | null => {
  const parts = split(value, '/');

  if (parts.length !== 2 || value.includes('"') || value.includes("'")) {
    return null;
  }

  const [rows = '', columns = ''] = parts;

  return [
    ['grid-template-rows', rows],
    ['grid-template-columns', columns],
    ['grid-template-areas', RESET],
  ];
};

const AREA_NAME = /^(?!auto$|span$)[a-z_][\w-]*$/i;

const lineEnd = (start: string): string => (AREA_NAME.test(start) ? start : 'auto');

const gridLines =
  (axis: 'row' | 'column') =>
  (value: string): Longhand[] | null => {
    const [start = '', end = lineEnd(start), ...rest] = split(value, '/');

    return rest.length > 0 || value.includes('var(')
      ? null
      : [
          [`grid-${axis}-start`, start],
          [`grid-${axis}-end`, end],
        ];
  };

const gridArea = (value: string): Longhand[] | null => {
  const [
    rowStart = '',
    columnStart = lineEnd(rowStart),
    rowEnd = lineEnd(rowStart),
    columnEnd = lineEnd(columnStart),
    ...extra
  ] = split(value, '/');

  return extra.length > 0 || value.includes('var(')
    ? null
    : [
        ['grid-row-start', rowStart],
        ['grid-column-start', columnStart],
        ['grid-row-end', rowEnd],
        ['grid-column-end', columnEnd],
      ];
};

const single = (property: string, value: string): Longhand[] => {
  const percent = /^(-?[\d.]+)%$/.exec(value)?.[1];

  if (property === 'opacity' && percent !== undefined) {
    return [[property, number(Number(percent) / 100)]];
  }

  if (property === '-webkit-user-select') {
    return [['user-select', value]];
  }

  if (property === 'aspect-ratio' && RATIO_NUMBER.test(value)) {
    return [[property, `${value} / 1`]];
  }

  return [[property, property === 'flex' ? (FLEX.get(value) ?? value) : value]];
};

const SHORTHANDS = new Map<string, (value: string) => Longhand[] | null>([
  ['outline', outline],
  ['background', background],
  ['text-decoration', decoration],
  ['transition', transition],
  ['list-style', listStyle],
  ['overflow', overflow],
  ['gap', gap],
  ['grid-template', gridTemplate],
  ['grid-area', gridArea],
  ['grid-row', gridLines('row')],
  ['grid-column', gridLines('column')],
]);

export const longhands = (property: string, value: string): Longhand[] => {
  return (
    SHORTHANDS.get(property)?.(value) ??
    border(property, value) ??
    borderLonghand(property, value) ??
    box(property, value) ??
    single(property, value)
  );
};
