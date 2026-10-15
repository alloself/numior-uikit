import type { AttrValue, Attrs, Mark } from '../model/node.types';
import type {
  AttrSpecs,
  MarkParseRule,
  MarkType,
  NodeParseRule,
  NodeType,
  Schema,
} from '../schema/schema.types';
import type { HtmlElement } from './html.types';

interface NodeRule {
  readonly type: NodeType;
  readonly rule: NodeParseRule;
}

interface MarkRule {
  readonly type: MarkType;
  readonly rule: MarkParseRule;
}

interface RuleIndex {
  readonly nodes: ReadonlyMap<string, readonly NodeRule[]>;
  readonly marks: ReadonlyMap<string, readonly MarkRule[]>;
  readonly styles: readonly MarkRule[];
}

export interface NodeCandidate {
  readonly type: NodeType;
  readonly attrs: Attrs;
}

const indexes = new WeakMap<Schema, RuleIndex>();

const safeAttrs = (
  specs: AttrSpecs,
  given: Readonly<Record<string, AttrValue>>,
): Attrs | undefined => {
  const result: Record<string, AttrValue> = {};

  for (const [name, spec] of Object.entries(specs)) {
    const value = given[name];
    const valid = value !== undefined && (spec.verify === undefined || spec.verify(value));
    const chosen = valid ? value : spec.default;

    if (chosen === undefined) {
      return undefined;
    }
    result[name] = chosen;
  }
  return result;
};

const grouped = <T>(entries: readonly (readonly [string, T])[]): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  for (const [key, value] of entries) {
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
};

const buildIndex = (schema: Schema): RuleIndex => {
  const nodeRules = [...schema.nodes.values()]
    .flatMap((type) => type.parse.map((rule): NodeRule => ({ type, rule })))
    .toSorted((left, right) => (right.rule.priority ?? 0) - (left.rule.priority ?? 0));

  const markRules = [...schema.marks.values()].flatMap((type) =>
    type.parse.map((rule): MarkRule => ({ type, rule })),
  );

  return {
    nodes: grouped(nodeRules.map((entry) => [entry.rule.tag, entry] as const)),
    marks: grouped(
      markRules.flatMap((entry) =>
        entry.rule.tag === undefined ? [] : [[entry.rule.tag, entry] as const],
      ),
    ),
    styles: markRules.filter((entry) => entry.rule.tag === undefined),
  };
};

const indexOf = (schema: Schema): RuleIndex => {
  const known = indexes.get(schema);

  if (known !== undefined) {
    return known;
  }
  const index = buildIndex(schema);

  indexes.set(schema, index);
  return index;
};

const attrsBy = (
  rule: NodeParseRule | MarkParseRule,
  specs: AttrSpecs,
  element: HtmlElement,
): Attrs | undefined => {
  const given = rule.attrs === undefined ? {} : rule.attrs(element);

  return given === false ? undefined : safeAttrs(specs, given);
};

export const nodeCandidates = (schema: Schema, element: HtmlElement): NodeCandidate[] =>
  (indexOf(schema).nodes.get(element.tag) ?? []).flatMap(({ type, rule }) => {
    const attrs = attrsBy(rule, type.attrs, element);

    return attrs === undefined ? [] : [{ type, attrs }];
  });

const styled = (rule: MarkParseRule, element: HtmlElement): boolean =>
  rule.style === undefined || element.style(rule.style) !== undefined;

export const marksOf = (schema: Schema, element: HtmlElement): Mark[] => {
  const index = indexOf(schema);
  const found = new Map<string, Mark>();

  const rules = [
    ...(index.marks.get(element.tag) ?? []),
    ...(element.attr('style') === undefined ? [] : index.styles),
  ];

  for (const { type, rule } of rules) {
    const attrs =
      found.has(type.name) || !styled(rule, element)
        ? undefined
        : attrsBy(rule, type.attrs, element);

    if (attrs !== undefined) {
      found.set(type.name, { type: type.name, attrs });
    }
  }
  return [...found.values()];
};
