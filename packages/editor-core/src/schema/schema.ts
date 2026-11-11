import { contentSize, normalizeContent } from '../model/node';
import { contentHole, renderTag } from '../render/render';
import type { MarkRender, NodeRender } from '../render/render.types';
import type { AttrValue, Attrs, ElementNode, Mark, TextNode } from '../model/node.types';
import { checkTree } from './check';
import { parseContentExpression } from './content-expression';
import { compileContent, reachesEnd, typesOf, type NameResolver } from './content-match';
import {
  ContentToken,
  NodeName,
  type AttrLimits,
  type AttrSpecs,
  type ElementInit,
  type MarkType,
  type NodeSpec,
  type NodeType,
  type Schema,
  type SchemaLimits,
  type SchemaSpec,
} from './schema.types';

interface Allowed {
  readonly nodes: ReadonlySet<string>;
  readonly marks: ReadonlySet<string>;
  readonly values: AttrLimits;
  readonly restricted: boolean;
}

interface Factories {
  readonly text: Schema['text'];
  readonly element: Schema['element'];
  readonly mark: Schema['mark'];
}

const EMPTY = parseContentExpression('');

const renderBlock: NodeRender = () => renderTag('div', {}, [contentHole]);

const renderLeaf: NodeRender = () => renderTag('div');

const renderInline: NodeRender = () => renderTag('span');

const renderMark: MarkRender = () => renderTag('span', {}, [contentHole]);

const defaultRender = (inline: boolean, leaf: boolean): NodeRender => {
  if (inline) {
    return renderInline;
  }
  return leaf ? renderLeaf : renderBlock;
};

const limitedAttrs = (specs: AttrSpecs, limits: AttrLimits[string] | undefined): AttrSpecs =>
  limits === undefined
    ? specs
    : Object.fromEntries(
        Object.entries(specs).map(([name, spec]) => {
          const values = limits[name];

          return [
            name,
            values === undefined
              ? spec
              : {
                  ...spec,
                  verify: (value: AttrValue) =>
                    values.includes(value) && (spec.verify === undefined || spec.verify(value)),
                },
          ];
        }),
      );

const groupsOf = (group: string | undefined): Set<string> =>
  new Set((group ?? '').split(/\s+/).filter((name) => name !== ''));

const isInline = (spec: SchemaSpec, name: string): boolean =>
  name === NodeName.Text || spec.nodes[name]?.inline === true;

const nodeResolver =
  (spec: SchemaSpec, allowed: Allowed): NameResolver =>
  (name) => {
    if (Object.hasOwn(spec.nodes, name)) {
      return allowed.nodes.has(name) ? [name] : [];
    }
    let known = false;
    const members: string[] = [];

    for (const [member, node] of Object.entries(spec.nodes)) {
      if (!groupsOf(node.group).has(name)) {
        continue;
      }

      known = true;

      if (!allowed.nodes.has(member)) {
        continue;
      }

      members.push(member);
    }

    if (!known) {
      throw new SyntaxError(`Unknown node type or group "${name}" in the schema`);
    }
    return members;
  };

const markNames = (spec: SchemaSpec, allowed: Allowed, expression: string): Set<string> => {
  const marks = Object.entries(spec.marks ?? {});
  const names = new Set<string>();

  for (const name of expression.split(/\s+/).filter((part) => part !== '')) {
    let known = false;

    for (const [mark, markSpec] of marks) {
      if (mark !== name && !groupsOf(markSpec.group).has(name)) {
        continue;
      }

      known = true;

      if (!allowed.marks.has(mark)) {
        continue;
      }

      names.add(mark);
    }

    if (!known) {
      throw new SyntaxError(`Unknown mark or mark group "${name}" in the schema`);
    }
  }
  return names;
};

const allowedMarks = (
  spec: SchemaSpec,
  allowed: Allowed,
  expression: string | undefined,
  inlineContent: boolean,
): Set<string> => {
  if (expression === ContentToken.Wildcard || (expression === undefined && inlineContent)) {
    return new Set(allowed.marks);
  }
  return expression === undefined ? new Set() : markNames(spec, allowed, expression);
};

const compileNode = (
  spec: SchemaSpec,
  allowed: Allowed,
  name: string,
  node: NodeSpec,
): NodeType => {
  const leaf = node.content === undefined;
  const expr = node.content === undefined ? EMPTY : parseContentExpression(node.content);
  const content = compileContent(expr, nodeResolver(spec, allowed));
  const inlineTypes = [...typesOf(content)].map((type) => isInline(spec, type));
  const inlineContent = inlineTypes.includes(true);

  if (inlineContent && inlineTypes.includes(false)) {
    throw new SyntaxError(`The content of "${name}" mixes inline and block nodes`);
  }
  const inline = isInline(spec, name);

  return {
    name,
    groups: groupsOf(node.group),
    inline,
    leaf,
    atom: leaf || node.atom === true,
    inlineContent,
    content,
    marks: allowedMarks(spec, allowed, node.marks, inlineContent),
    attrs: limitedAttrs(node.attrs ?? {}, allowed.values[name]),
    code: node.code === true,
    slots: node.slots ?? (groupsOf(node.group).has('list') ? 'all' : 'none'),
    plainText: node.plainText,
    render: node.render ?? defaultRender(inline, leaf),
    renderSubtree: node.renderSubtree,
    parse: node.parse ?? [],
  };
};

const compileNodes = (spec: SchemaSpec, allowed: Allowed): Map<string, NodeType> =>
  Object.entries(spec.nodes).reduce<Map<string, NodeType>>((compiled, [name, node]) => {
    if (allowed.nodes.has(name)) {
      compiled.set(name, compileNode(spec, allowed, name, node));
    }
    return compiled;
  }, new Map());

const usableTypes = (types: ReadonlyMap<string, NodeType>): Set<string> => {
  const usable = new Set<string>();
  let grown = true;

  while (grown) {
    grown = false;

    for (const type of types.values()) {
      if (usable.has(type.name) || !reachesEnd(type.content, (name) => usable.has(name))) {
        continue;
      }

      usable.add(type.name);
      grown = true;
    }
  }
  return usable;
};

const settleNodes = (spec: SchemaSpec, start: Allowed): Map<string, NodeType> => {
  let allowed = start;
  let types = compileNodes(spec, allowed);
  let usable = usableTypes(types);

  while (usable.size !== types.size) {
    if (!allowed.restricted) {
      const broken = [...types.keys()].filter((name) => !usable.has(name)).join(', ');

      throw new SyntaxError(`Node types can never hold valid content: ${broken}`);
    }
    allowed = { ...allowed, nodes: usable };
    types = compileNodes(spec, allowed);
    usable = usableTypes(types);
  }
  return types;
};

const compileMarks = (spec: SchemaSpec, allowed: Allowed): Map<string, MarkType> =>
  Object.entries(spec.marks ?? {}).reduce<Map<string, MarkType>>((compiled, [name, mark]) => {
    if (allowed.marks.has(name)) {
      compiled.set(name, {
        name,
        rank: compiled.size,
        groups: groupsOf(mark.group),
        attrs: limitedAttrs(mark.attrs ?? {}, allowed.values[name]),
        render: mark.render ?? renderMark,
        parse: mark.parse ?? [],
      });
    }
    return compiled;
  }, new Map());

const resolveAttrs = (
  owner: string,
  specs: AttrSpecs,
  given: Readonly<Record<string, AttrValue>>,
): Attrs => {
  const result: Record<string, AttrValue> = {};

  for (const key of Object.keys(given)) {
    if (!Object.hasOwn(specs, key)) {
      throw new RangeError(`Unknown attribute "${key}" on "${owner}"`);
    }
  }
  for (const [key, spec] of Object.entries(specs)) {
    const value = Object.hasOwn(given, key) ? given[key] : spec.default;

    if (value === undefined) {
      throw new RangeError(`Missing attribute "${key}" on "${owner}"`);
    }
    if (spec.verify !== undefined && !spec.verify(value)) {
      throw new RangeError(`Invalid attribute "${key}" on "${owner}"`);
    }
    result[key] = value;
  }
  return result;
};

const factoriesOf = (
  nodes: ReadonlyMap<string, NodeType>,
  marks: ReadonlyMap<string, MarkType>,
): Factories => {
  const mark = (type: string, attrs: Readonly<Record<string, AttrValue>> = {}): Mark => {
    const markType = marks.get(type);

    if (markType === undefined) {
      throw new RangeError(`Unknown mark "${type}"`);
    }
    return { type, attrs: resolveAttrs(type, markType.attrs, attrs) };
  };

  const rankOf = (given: Mark): number => marks.get(given.type)?.rank ?? Number.POSITIVE_INFINITY;

  const text = (value: string, given: readonly Mark[] = []): TextNode => {
    const byType = new Map(given.map((item) => [item.type, mark(item.type, item.attrs)]));

    return {
      kind: 'text',
      text: value,
      marks: [...byType.values()].toSorted((left, right) => rankOf(left) - rankOf(right)),
    };
  };

  const element = (type: string, init: ElementInit): ElementNode => {
    const nodeType = type === NodeName.Text ? undefined : nodes.get(type);

    if (nodeType === undefined) {
      throw new RangeError(`Unknown element type "${type}"`);
    }
    if (init.id === '') {
      throw new RangeError(`An element of type "${type}" needs an id`);
    }
    if (nodeType.leaf && (init.content?.length ?? 0) > 0) {
      throw new RangeError(`The leaf "${type}" cannot hold content`);
    }
    const content = normalizeContent(init.content ?? []);

    return {
      kind: 'element',
      id: init.id,
      type,
      attrs: resolveAttrs(type, nodeType.attrs, init.attrs ?? {}),
      content,
      leaf: nodeType.leaf,
      size: nodeType.leaf ? 1 : contentSize(content) + 2,
    };
  };

  return { text, element, mark };
};

const limitedTo = (
  kind: string,
  known: Readonly<Record<string, unknown>>,
  current: ReadonlySet<string>,
  names: readonly string[] | undefined,
  kept: readonly string[],
): Set<string> => {
  for (const name of names ?? []) {
    if (!Object.hasOwn(known, name)) {
      throw new RangeError(`Unknown ${kind} "${name}" in the schema limits`);
    }
  }
  return new Set([...(names ?? current), ...kept].filter((name) => current.has(name)));
};

const ownerAttrs = (spec: SchemaSpec, owner: string): AttrSpecs | undefined =>
  spec.nodes[owner]?.attrs ?? spec.marks?.[owner]?.attrs;

const mergeValues = (
  spec: SchemaSpec,
  current: AttrLimits,
  added: AttrLimits | undefined,
): AttrLimits => {
  const merged: Record<string, Record<string, readonly AttrValue[]>> = {};

  for (const [owner, attrs] of Object.entries(current)) {
    merged[owner] = { ...attrs };
  }
  for (const [owner, attrs] of Object.entries(added ?? {})) {
    const known = ownerAttrs(spec, owner);

    for (const [name, values] of Object.entries(attrs)) {
      if (known === undefined || !Object.hasOwn(known, name)) {
        throw new RangeError(`Unknown attribute "${name}" on "${owner}" in the schema limits`);
      }
      const before = merged[owner]?.[name];

      merged[owner] = {
        ...merged[owner],
        [name]: before === undefined ? values : values.filter((value) => before.includes(value)),
      };
    }
  }
  return merged;
};

const buildSchema = (spec: SchemaSpec, allowed: Allowed): Schema => {
  const topName = spec.top ?? 'doc';
  const nodes = settleNodes(spec, allowed);
  const marks = compileMarks(spec, allowed);
  const top = nodes.get(topName);

  if (top === undefined) {
    throw new RangeError(`The top node "${topName}" is missing or can never be valid`);
  }

  const restrict = (limits: SchemaLimits): Schema =>
    buildSchema(spec, {
      nodes: limitedTo('node type', spec.nodes, allowed.nodes, limits.nodes, [topName, 'text']),
      marks: limitedTo('mark', spec.marks ?? {}, allowed.marks, limits.marks, []),
      values: mergeValues(spec, allowed.values, limits.values),
      restricted: true,
    });

  const schema: Schema = {
    name: spec.name ?? 'document',
    version: spec.version ?? 1,
    spec,
    top,
    nodes,
    marks,
    ...factoriesOf(nodes, marks),
    check: (root) => checkTree(schema, root),
    restrict,
  };

  return schema;
};

export const createSchema = (spec: SchemaSpec): Schema =>
  buildSchema(spec, {
    nodes: new Set(Object.keys(spec.nodes)),
    marks: new Set(Object.keys(spec.marks ?? {})),
    values: {},
    restricted: false,
  });
