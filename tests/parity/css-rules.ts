import { compareSpecificity, listSpecificity, splitSelectors } from './css-specificity.ts';
import {
  RESET,
  gridAlignment,
  helperReads,
  isGridDisplay,
  longhands,
  normalized,
  splitTokens,
  substituteHelpers,
} from './css-values.ts';
import type {
  CssBlock,
  CssDeclaration,
  CssEnvironment,
  CssRule,
  Displays,
  DroppedReset,
  FoldedRules,
  LonghandOwner,
  RuleComparison,
} from './css-rules.types.ts';

const OPENERS = new Map([
  ['(', 1],
  [')', -1],
]);

const splitTop = (source: string): string[] => {
  const parts: string[] = [];
  let [depth, parens, start] = [0, 0, 0];

  Array.from(source).forEach((char, at) => {
    parens += OPENERS.get(char) ?? 0;

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
    }

    const closes = parens === 0 && depth === 0 && (char === ';' || char === '}');

    if (!closes) {
      return;
    }

    parts.push(source.slice(start, at + 1));
    start = at + 1;
  });

  return [...parts, source.slice(start)].map((part) => part.trim()).filter(Boolean);
};

const blockOf = (part: string): CssBlock | null => {
  const open = part.indexOf('{');

  return open < 0 || !part.endsWith('}')
    ? null
    : { prelude: squash(part.slice(0, open)), body: part.slice(open + 1, -1) };
};

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const declarationOf = (part: string): CssDeclaration => {
  const colon = part.indexOf(':');

  return {
    property: part.slice(0, colon).trim(),
    value: squash(part.slice(colon + 1).replace(/;$/, '')),
  };
};

const withoutComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '');

const rulesIn = (source: string, context: string, parent: string): CssRule[] => {
  const own: CssDeclaration[] = [];
  const nested: CssRule[] = [];

  splitTop(source).forEach((part) => {
    const block = blockOf(part);

    if (block === null) {
      own.push(declarationOf(part));
      return;
    }

    if (block.prelude.startsWith('@')) {
      nested.push(...rulesIn(block.body, squash(`${context} ${block.prelude}`), parent));
      return;
    }
    nested.push(...rulesIn(block.body, context, squash(`${parent} ${block.prelude}`)));
  });

  const rule =
    own.length > 0 && parent !== '' ? [{ context, selector: parent, declarations: own }] : [];

  return [...rule, ...nested];
};

export const parseRules = (source: string): CssRule[] => rulesIn(withoutComments(source), '', '');

const COLOR_MIX_GUARD = '@supports (color: color-mix(in lab, red, red))';

const guardedBy = (rule: CssRule, owner: CssRule | undefined): owner is CssRule =>
  owner !== undefined &&
  rule.selector === owner.selector &&
  rule.context === `${owner.context} ${COLOR_MIX_GUARD}`.trim();

const withGuarded = (owner: CssRule, guarded: CssRule): CssRule => {
  const values = new Map(guarded.declarations.map(({ property, value }) => [property, value]));

  return {
    ...owner,
    declarations: owner.declarations.map(({ property, value }) => ({
      property,
      value: values.get(property) ?? value,
    })),
  };
};

export const foldColorMixFallbacks = (rules: readonly CssRule[]): FoldedRules => {
  return rules.reduce<FoldedRules>(
    (folded, rule) => {
      const owner = folded.rules.at(-1);

      if (!guardedBy(rule, owner)) {
        return { rules: [...folded.rules, rule], fallbacks: folded.fallbacks };
      }

      return {
        rules: [...folded.rules.slice(0, -1), withGuarded(owner, rule)],
        fallbacks: folded.fallbacks + rule.declarations.length,
      };
    },
    { rules: [], fallbacks: 0 },
  );
};

export const parseAliases = (source: string): Map<string, string> => {
  return parseRules(source).reduce((aliases, rule) => {
    rule.declarations.forEach(({ property, value }) => {
      if (!property.startsWith('--nui-')) {
        return;
      }

      aliases.set(property, value);
    });

    return aliases;
  }, new Map<string, string>());
};

const PROPERTY_RULE = /@property\s+(--tw-[a-z-]+)\s*\{([^}]*)\}/g;
const THEME_BLOCK = /^@theme(?:\s+(?:static|default))*$/;
const HELPER_PREFIX = '--tw-';

export const parseHelpers = (output: string): Map<string, string> => {
  return Array.from(output.matchAll(PROPERTY_RULE)).reduce((helpers, [, name = '', body = '']) => {
    const initial = /initial-value:\s*([^;]+);/.exec(body)?.[1];

    if (initial === undefined) {
      return helpers;
    }

    helpers.set(name, initial.trim());

    return helpers;
  }, new Map<string, string>());
};

const themeDeclarations = (source: string): CssDeclaration[] => {
  return splitTop(withoutComments(source)).reduce<CssDeclaration[]>((declarations, part) => {
    const block = blockOf(part);

    if (block === null || !THEME_BLOCK.test(block.prelude)) {
      return declarations;
    }

    for (const entry of splitTop(block.body)) {
      if (blockOf(entry) !== null) {
        continue;
      }

      declarations.push(declarationOf(entry));
    }

    return declarations;
  }, []);
};

const scopedKeys = (sources: readonly string[]): Set<string> => {
  return sources.reduce((keys, source) => {
    for (const rule of parseRules(source)) {
      for (const { property } of rule.declarations) {
        keys.add(property);
      }
    }

    return keys;
  }, new Set<string>());
};

export const parseFixedKeys = (
  themes: readonly string[],
  scopes: readonly string[],
): Map<string, string> => {
  const scoped = scopedKeys(scopes);

  return themes.flatMap(themeDeclarations).reduce((fixed, { property, value }) => {
    if (!property.startsWith('--') || scoped.has(property)) {
      return fixed;
    }

    fixed.set(property, value);

    return fixed;
  }, new Map<string, string>());
};

const keyOf = (rule: CssRule): string => `${rule.context} | ${rule.selector}`.trim();

const isHelper = (property: string): boolean => property.startsWith(HELPER_PREFIX);

const UNRELATED = /^border-(?:radius|collapse|spacing|image)|^border-.+-radius$/;

const EXTRA_LONGHANDS = new Map([
  ['font', ['line-height']],
  ['inset', ['top', 'right', 'bottom', 'left']],
  ['gap', ['row-gap', 'column-gap']],
]);

const covers = (shorthand: string, longhand: string): boolean =>
  (longhand.startsWith(`${shorthand}-`) && !UNRELATED.test(longhand)) ||
  (EXTRA_LONGHANDS.get(shorthand)?.includes(longhand) ?? false);

const related = (left: string, right: string): boolean =>
  covers(left, right) || covers(right, left);

const orderIssues = (base: CssRule, next: CssRule): string[] => {
  const position = new Map(next.declarations.map(({ property }, at) => [property, at]));

  return base.declarations.flatMap((first, at) =>
    base.declarations.slice(at + 1).reduce<string[]>((issues, second) => {
      const [before, after] = [position.get(first.property), position.get(second.property)];
      const swapped = before !== undefined && after !== undefined && before > after;

      if (
        first.property !== second.property &&
        related(first.property, second.property) &&
        swapped
      ) {
        issues.push(`${keyOf(base)}: ${first.property} must stay before ${second.property}`);
      }
      return issues;
    }, []),
  );
};

const helperValues = (rule: CssRule): Map<string, string> => {
  return rule.declarations.reduce((values, { property, value }) => {
    if (!isHelper(property)) {
      return values;
    }

    values.set(property, value);

    return values;
  }, new Map<string, string>());
};

export const effective = (rule: CssRule, environment: CssEnvironment): Map<string, string> => {
  const local = helperValues(rule);

  return rule.declarations.reduce((values, { property, value }) => {
    if (isHelper(property)) {
      return values;
    }

    const plain = normalized(substituteHelpers(value, local, environment.helpers), environment);

    for (const [name, part] of longhands(property, plain)) {
      values.delete(name);
      values.set(name, part);
    }

    return values;
  }, new Map<string, string>());
};

const subjectBlock = (selector: string): string => {
  const name = /^\.([\w-]+)/.exec(splitTokens(selector).at(-1) ?? '')?.[1];

  return name === undefined ? '' : `.${name.replace(/--.*$/, '')}`;
};

const ARGUMENTS = /\([^()]*\)/g;
const CLASS_NAME = /\.[\w-]+/g;

const withoutArguments = (compound: string): string => {
  const bare = compound.replace(ARGUMENTS, '');

  return bare === compound ? bare : withoutArguments(bare);
};

const subjectClasses = (selector: string): string[] => {
  const compound = withoutArguments(splitTokens(selector).at(-1) ?? '');

  return compound.includes('::') ? [] : (compound.match(CLASS_NAME) ?? []);
};

const displaysOf = (rules: readonly CssRule[], environment: CssEnvironment): Displays =>
  rules.reduce((displays, rule) => {
    const display = effective(rule, environment).get('display');

    if (display === undefined) {
      return displays;
    }

    for (const name of splitSelectors(rule.selector).flatMap(subjectClasses)) {
      displays.set(name, [...(displays.get(name) ?? []), display]);
    }

    return displays;
  }, new Map<string, readonly string[]>());

const alwaysGrid = (displays: readonly string[] | undefined): boolean =>
  displays !== undefined && displays.every(isGridDisplay);

const neverOffGrid = (selector: string, displays: Displays): boolean =>
  subjectClasses(selector).every((name) => (displays.get(name) ?? []).every(isGridDisplay));

const onGrid = (rule: CssRule, displays: Displays, environment: CssEnvironment): boolean => {
  const own = effective(rule, environment).get('display');
  const selectors = splitSelectors(rule.selector);

  if (!selectors.every((selector) => neverOffGrid(selector, displays))) {
    return false;
  }

  if (own !== undefined) {
    return isGridDisplay(own);
  }

  return selectors.every((selector) => alwaysGrid(displays.get(subjectBlock(selector))));
};

const sameLonghand = (property: string, values: readonly string[], grid: boolean): boolean => {
  const [left = '', right = ''] = values;

  return (
    left === right || (grid && gridAlignment(property, left) === gridAlignment(property, right))
  );
};

const declarationIssues = (
  [base, next]: readonly [CssRule, CssRule],
  index: number,
  grid: boolean,
  environment: CssEnvironment,
): RuleComparison => {
  const [before, after] = [effective(base, environment), effective(next, environment)];
  const issues: string[] = [];
  const dropped: string[] = [];

  for (const [property, value] of before) {
    const pair = after.get(property);

    if (pair !== undefined && sameLonghand(property, [value, pair], grid)) {
      continue;
    }

    if (pair === undefined && value === RESET) {
      dropped.push(property);
      continue;
    }

    issues.push(`${keyOf(base)}: lost ${property}: ${value}`);
  }

  for (const [property, value] of after) {
    const known = before.get(property);

    if (known !== undefined && sameLonghand(property, [known, value], grid)) {
      continue;
    }

    issues.push(`${keyOf(base)}: gained ${property}: ${value}`);
  }

  const resets = dropped.length === 0 ? [] : [{ rule: keyOf(base), index, properties: dropped }];

  return { issues: [...issues, ...orderIssues(base, next)], resets };
};

const setLonghands = (
  rules: readonly CssRule[],
  environment: CssEnvironment,
): Map<string, LonghandOwner[]> => {
  return rules.reduce((owners, rule, index) => {
    for (const [property, value] of effective(rule, environment)) {
      if (value === RESET) {
        continue;
      }

      const list = owners.get(property) ?? [];

      list.push({ rule: keyOf(rule), index, selector: rule.selector });
      owners.set(property, list);
    }

    return owners;
  }, new Map<string, LonghandOwner[]>());
};

const overrides = (
  owner: LonghandOwner,
  reset: DroppedReset,
  rules: readonly CssRule[],
): boolean => {
  const weakest = listSpecificity(owner.selector);
  const strongest = listSpecificity(rules[reset.index]?.selector ?? '');
  const later = owner.index > reset.index;

  return (
    later && weakest.every((own) => strongest.every((other) => compareSpecificity(own, other) >= 0))
  );
};

const resetIssues = (
  resets: readonly DroppedReset[],
  rules: readonly CssRule[],
  environment: CssEnvironment,
): string[] => {
  const owners = setLonghands(rules, environment);

  return resets.flatMap((reset) =>
    reset.properties.reduce<string[]>((issues, property) => {
      const owner = owners.get(property)?.find((candidate) => !overrides(candidate, reset, rules));

      if (owner === undefined) {
        return issues;
      }

      issues.push(`${reset.rule}: drops the reset of ${property}, which ${owner.rule} sets`);

      return issues;
    }, []),
  );
};

const helperSetters = (rules: readonly CssRule[]): Set<string> => {
  return rules.reduce((names, rule) => {
    for (const name of helperValues(rule).keys()) {
      names.add(name);
    }

    return names;
  }, new Set<string>());
};

const foreignReads = (rule: CssRule, setters: ReadonlySet<string>): string[] => {
  const own = helperValues(rule);

  return rule.declarations.reduce<string[]>((issues, { value }) => {
    for (const name of helperReads(value)) {
      if (own.has(name) || !setters.has(name)) {
        continue;
      }

      issues.push(`${keyOf(rule)}: reads ${name}, which another rule sets`);
    }

    return issues;
  }, []);
};

export const helperIssues = (rules: readonly CssRule[]): string[] => {
  const setters = helperSetters(rules);

  return rules.flatMap((rule) => foreignReads(rule, setters));
};

export const compareRules = (
  base: readonly CssRule[],
  next: readonly CssRule[],
  environment: CssEnvironment,
): RuleComparison => {
  const issues: string[] = [];
  const resets: DroppedReset[] = [];
  const displays = [displaysOf(base, environment), displaysOf(next, environment)];

  for (const [at, rule] of base.entries()) {
    const pair = next[at];

    if (pair === undefined || keyOf(pair) !== keyOf(rule)) {
      issues.push(
        `rule ${at + 1}: expected ${keyOf(rule)}, found ${pair ? keyOf(pair) : 'nothing'}`,
      );

      continue;
    }

    const [baseDisplays = new Map(), nextDisplays = new Map()] = displays;

    const grid = onGrid(rule, baseDisplays, environment) && onGrid(pair, nextDisplays, environment);

    const result = declarationIssues([rule, pair], at, grid, environment);

    for (const issue of result.issues) {
      issues.push(issue);
    }

    for (const reset of result.resets) {
      resets.push(reset);
    }
  }

  for (const rule of next.slice(base.length)) {
    issues.push(`extra rule ${keyOf(rule)}`);
  }

  for (const issue of [...helperIssues(next), ...resetIssues(resets, next, environment)]) {
    issues.push(issue);
  }

  return { issues, resets };
};
