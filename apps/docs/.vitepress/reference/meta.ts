import type {
  ComponentMeta,
  EventMeta,
  PropertyMeta,
  PropertyMetaSchema,
} from 'vue-component-meta';
import type {
  ComponentEntry,
  ComponentReference,
  ReferenceMember,
  ReferenceModel,
  ReferenceProp,
  ReferencePropKind,
  ReferenceStyles,
} from './reference.types.ts';

const UPDATE_PREFIX = 'update:';
const BOOLEANS = new Set(['true', 'false']);
const OPTIONAL_SUFFIX = / \| undefined$/;

const literalValues = (schema: PropertyMetaSchema): string[] => {
  if (typeof schema === 'string') {
    return /^".*"$/.test(schema) || BOOLEANS.has(schema) ? [schema.replaceAll('"', '')] : [];
  }
  if (schema.kind === 'literal') {
    return [schema.value.replaceAll('"', '')];
  }
  return schema.kind === 'enum' ? (schema.schema ?? []).flatMap(literalValues) : [];
};

const kindOf = (type: string, values: readonly string[]): ReferencePropKind => {
  if (values.length > 0 && values.every((value) => BOOLEANS.has(value))) {
    return 'boolean';
  }
  if (values.length > 0) {
    return 'enum';
  }
  if (type.includes('=>')) {
    return 'function';
  }
  const bare = type.replace(OPTIONAL_SUFFIX, '');

  return bare === 'string' || bare === 'number' ? bare : 'other';
};

const NO_MEMBERS: ReadonlyMap<string, string> = new Map();

const defaultOf = (
  value: string | undefined,
  members: ReadonlyMap<string, string>,
): string | undefined =>
  value === undefined || value === 'undefined' ? undefined : (members.get(value) ?? value);

const propOf = (prop: PropertyMeta, members: ReadonlyMap<string, string>): ReferenceProp => {
  const values = literalValues(prop.schema);
  const kind = kindOf(prop.type, values);

  return {
    name: prop.name,
    type: prop.type.replace(OPTIONAL_SUFFIX, ''),
    kind,
    required: prop.required,
    default: defaultOf(prop.default, members),
    values: kind === 'enum' ? values : undefined,
    description: undefined,
  };
};

const memberOf = (member: { name: string; type: string }): ReferenceMember => ({
  name: member.name,
  type: member.type,
  description: undefined,
});

const modelOf = (
  event: EventMeta,
  prop: PropertyMeta,
  members: ReadonlyMap<string, string>,
): ReferenceModel => {
  const propName = event.name.slice(UPDATE_PREFIX.length);

  return {
    name: propName === 'modelValue' ? 'v-model' : `v-model:${propName}`,
    prop: propName,
    event: event.name,
    type: prop.type.replace(OPTIONAL_SUFFIX, ''),
    default: defaultOf(prop.default, members),
    description: undefined,
  };
};

export const componentReference = (
  entry: ComponentEntry,
  meta: ComponentMeta,
  styles: ReferenceStyles | undefined,
  stylesheets: readonly string[],
  messages: string | undefined,
  members: ReadonlyMap<string, string> = NO_MEMBERS,
): ComponentReference => {
  const own = meta.props.filter((prop) => !prop.global);

  const models = meta.events.flatMap((event) => {
    const prop = own.find((candidate) => `${UPDATE_PREFIX}${candidate.name}` === event.name);

    return prop === undefined ? [] : [modelOf(event, prop, members)];
  });

  const modelProps = new Set(models.map((model) => model.prop));
  const modelEvents = new Set(models.map((model) => model.event));

  return {
    name: entry.name,
    package: entry.package,
    family: entry.family,
    file: entry.file,
    styles,
    stylesheets,
    messages,
    props: own.reduce<ReferenceProp[]>((found, prop) => {
      if (!modelProps.has(prop.name)) {
        found.push(propOf(prop, members));
      }
      return found;
    }, []),
    models,
    events: meta.events.reduce<ReferenceMember[]>((found, event) => {
      if (!modelEvents.has(event.name)) {
        found.push(memberOf(event));
      }
      return found;
    }, []),
    slots: meta.slots.map(memberOf),
    exposed: meta.exposed.reduce<ReferenceMember[]>((found, member) => {
      if (!member.name.startsWith('$')) {
        found.push(memberOf(member));
      }
      return found;
    }, []),
    keyboard: [],
    configurator: undefined,
  };
};
