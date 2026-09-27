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

const defaultOf = (value: string | undefined): string | undefined =>
  value === undefined || value === 'undefined' ? undefined : value;

const propOf = (prop: PropertyMeta): ReferenceProp => {
  const values = literalValues(prop.schema);
  const kind = kindOf(prop.type, values);

  return {
    name: prop.name,
    type: prop.type.replace(OPTIONAL_SUFFIX, ''),
    kind,
    required: prop.required,
    default: defaultOf(prop.default),
    values: kind === 'enum' ? values : undefined,
    description: undefined,
  };
};

const memberOf = (member: { name: string; type: string }): ReferenceMember => ({
  name: member.name,
  type: member.type,
  description: undefined,
});

const modelOf = (event: EventMeta, prop: PropertyMeta): ReferenceModel => {
  const propName = event.name.slice(UPDATE_PREFIX.length);

  return {
    name: propName === 'modelValue' ? 'v-model' : `v-model:${propName}`,
    prop: propName,
    event: event.name,
    type: prop.type.replace(OPTIONAL_SUFFIX, ''),
    default: defaultOf(prop.default),
    description: undefined,
  };
};

export const componentReference = (
  entry: ComponentEntry,
  meta: ComponentMeta,
  styles: ReferenceStyles | undefined,
  messages: string | undefined,
): ComponentReference => {
  const own = meta.props.filter((prop) => !prop.global);

  const models = meta.events.flatMap((event) => {
    const prop = own.find((candidate) => `${UPDATE_PREFIX}${candidate.name}` === event.name);

    return prop === undefined ? [] : [modelOf(event, prop)];
  });

  const modelProps = new Set(models.map((model) => model.prop));
  const modelEvents = new Set(models.map((model) => model.event));

  return {
    name: entry.name,
    package: entry.package,
    family: entry.family,
    file: entry.file,
    styles,
    messages,
    props: own.filter((prop) => !modelProps.has(prop.name)).map(propOf),
    models,
    events: meta.events.filter((event) => !modelEvents.has(event.name)).map(memberOf),
    slots: meta.slots.map(memberOf),
    exposed: meta.exposed.filter((member) => !member.name.startsWith('$')).map(memberOf),
    keyboard: [],
    configurator: undefined,
  };
};
