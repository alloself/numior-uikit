import type { Aliases, CssBlock, CssDeclaration, CssRule } from './css-rules.types';

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

    if (parens === 0 && ((char === ';' && depth === 0) || (char === '}' && depth === 0))) {
      parts.push(source.slice(start, at + 1));
      start = at + 1;
    }
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

export const parseAliases = (source: string): Map<string, string> => {
  return parseRules(source).reduce((aliases, rule) => {
    rule.declarations.forEach(({ property, value }) => {
      if (property.startsWith('--nui-')) {
        aliases.set(property, value);
      }
    });

    return aliases;
  }, new Map<string, string>());
};

const resolve = (value: string, aliases: Aliases, depth = 0): string => {
  const next = value.replace(/var\((--nui-[a-z0-9-]+)\)/g, (whole, name: string) => {
    return aliases.get(name) ?? whole;
  });

  return next === value || depth > 8 ? next : resolve(next, aliases, depth + 1);
};

export const canonical = (value: string, aliases: Aliases): string => {
  return squash(resolve(value, aliases))
    .replace(/(^|[\s(,])0px(?=$|[\s),])/g, '$10')
    .replace(/(^|[\s(,])0?\.(\d)/g, '$10.$2')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/'/g, '"');
};

const keyOf = (rule: CssRule): string => `${rule.context} | ${rule.selector}`.trim();

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

const declarationIssues = (base: CssRule, next: CssRule, aliases: Aliases): string[] => {
  const before = base.declarations.map(
    ({ property, value }) => `${property}: ${canonical(value, aliases)}`,
  );

  const after = next.declarations.map(
    ({ property, value }) => `${property}: ${canonical(value, aliases)}`,
  );

  const lost = before.filter((line) => !after.includes(line));
  const added = after.filter((line) => !before.includes(line));

  return [
    ...lost.map((line) => `${keyOf(base)}: lost ${line}`),
    ...added.map((line) => `${keyOf(base)}: gained ${line}`),
    ...orderIssues(base, next),
  ];
};

export const compareRules = (
  base: readonly CssRule[],
  next: readonly CssRule[],
  aliases: Aliases,
): string[] => {
  const issues: string[] = [];

  base.forEach((rule, at) => {
    const pair = next[at];

    if (pair === undefined || keyOf(pair) !== keyOf(rule)) {
      issues.push(
        `rule ${at + 1}: expected ${keyOf(rule)}, found ${pair ? keyOf(pair) : 'nothing'}`,
      );

      return;
    }
    issues.push(...declarationIssues(rule, pair, aliases));
  });

  next.slice(base.length).forEach((rule) => {
    issues.push(`extra rule ${keyOf(rule)}`);
  });

  return issues;
};
