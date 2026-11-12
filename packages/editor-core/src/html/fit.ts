import type { ContentNode, ElementNode, IdSource } from '../model/node.types';
import { NodeName, type ContentMatch, type NodeType, type Schema } from '../schema/schema.types';

interface Route {
  readonly match: ContentMatch;
  readonly path: readonly NodeType[];
}

const wrappings = new WeakMap<ContentMatch, Map<string, readonly NodeType[] | null>>();

const fillings = new WeakMap<ContentMatch, readonly NodeType[] | null>();

const pending = new WeakSet<ContentMatch>();

const creatable = (type: NodeType): boolean =>
  type.name !== NodeName.Text &&
  Object.values(type.attrs).every((attr) => attr.default !== undefined);

const wrappers = (schema: Schema, match: ContentMatch): NodeType[] =>
  [...match.next.keys()]
    .map((name) => schema.nodes.get(name))
    .filter((type): type is NodeType => type !== undefined && !type.leaf && creatable(type));

const searchWrapping = (
  schema: Schema,
  match: ContentMatch,
  target: string,
): readonly NodeType[] | null => {
  const queue: Route[] = [{ match, path: [] }];
  const seen = new Set<ContentMatch>([match]);

  for (let route = queue.shift(); route !== undefined; route = queue.shift()) {
    if (route.match.next.has(target)) {
      return route.path;
    }
    for (const type of wrappers(schema, route.match)) {
      if (seen.has(type.content)) {
        continue;
      }

      seen.add(type.content);
      queue.push({ match: type.content, path: [...route.path, type] });
    }
  }
  return null;
};

export const findWrapping = (
  schema: Schema,
  match: ContentMatch,
  target: string,
): readonly NodeType[] | undefined => {
  const known = wrappings.get(match) ?? new Map<string, readonly NodeType[] | null>();
  const found = known.has(target) ? known.get(target) : searchWrapping(schema, match, target);

  known.set(target, found ?? null);
  wrappings.set(match, known);
  return found ?? undefined;
};

const fillable = (schema: Schema, type: NodeType): boolean =>
  creatable(type) && (type.leaf || fillTypes(schema, type.content) !== undefined);

const searchFill = (schema: Schema, match: ContentMatch): readonly NodeType[] | null => {
  const queue: Route[] = [{ match, path: [] }];
  const seen = new Set<ContentMatch>([match]);

  for (let route = queue.shift(); route !== undefined; route = queue.shift()) {
    if (route.match.validEnd) {
      return route.path;
    }
    for (const [name, next] of route.match.next) {
      const type = schema.nodes.get(name);

      if (type === undefined || seen.has(next) || !fillable(schema, type)) {
        continue;
      }

      seen.add(next);
      queue.push({ match: next, path: [...route.path, type] });
    }
  }
  return null;
};

const fillTypes = (schema: Schema, match: ContentMatch): readonly NodeType[] | undefined => {
  const known = fillings.get(match);

  if (known !== undefined || pending.has(match)) {
    return known ?? undefined;
  }
  pending.add(match);
  const found = searchFill(schema, match);

  pending.delete(match);
  fillings.set(match, found);
  return found ?? undefined;
};

const createFilled = (schema: Schema, type: NodeType, ids: IdSource): ElementNode =>
  schema.element(type.name, {
    id: ids.next(),
    content: (fillTypes(schema, type.content) ?? []).map((inner) =>
      createFilled(schema, inner, ids),
    ),
  });

export const fillEnd = (
  schema: Schema,
  match: ContentMatch,
  ids: IdSource,
): readonly ContentNode[] | undefined =>
  fillTypes(schema, match)?.map((type) => createFilled(schema, type, ids));
