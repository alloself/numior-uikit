import {
  anyOf,
  isBoolean,
  isNumber,
  isRecord,
  isString,
  isUnknown,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
  type NuiControlRegistry,
} from '@numior/primitives';
import { ValidateOn, type FieldRule } from '../../core/form.types';
import { byPath, type FieldSelector } from '../../paths/selector';
import { adaptRule } from '../../rules/adapt-rule';
import type { AnyFieldRule } from '../../rules/async-rule';
import { email, max, min, pattern, required } from '../../rules/rules';
import { getAt } from '../../values/access';
import { cloneValue } from '../../values/clone';
import { formConfig } from './config';
import {
  FormConfigIssueCode,
  FormConfigResultKind,
  FormJsonRuleName,
  type FormConfigIssue,
  type FormJsonArray,
  type FormJsonCondition,
  type FormJsonEntry,
  type FormJsonField,
  type FormJsonRule,
  type FormJsonSection,
  type ParsedFormConfig,
  type ParseFormConfigOptions,
} from './parse-config.types';
import {
  NuiSmartFormEntryKind,
  type NuiSmartFormCondition,
  type NuiSmartFormEntry,
} from './smart-form.types';

type JsonRow = Readonly<Record<string, unknown>>;

interface Builder<S extends object> {
  readonly issues: FormConfigIssue[];
  readonly controls: NuiControlRegistry;
  entries(list: readonly FormJsonEntry[], at: string): NuiSmartFormEntry<S>[];
}

const isList = listOf(isUnknown);
const isRows = listOf(isRecord);

const isJsonRule: Guard<FormJsonRule> = anyOf(
  shapeOf({
    rule: oneOf(FormJsonRuleName.Required, FormJsonRuleName.Email),
    message: optional(isString),
  }),
  shapeOf({
    rule: oneOf(FormJsonRuleName.Min, FormJsonRuleName.Max),
    limit: isNumber,
    message: optional(isString),
  }),
  shapeOf({
    rule: oneOf(FormJsonRuleName.Pattern),
    source: isString,
    flags: optional(isString),
    message: optional(isString),
  }),
);

const isCondition: Guard<FormJsonCondition> = anyOf(
  shapeOf({ path: isString, equals: isUnknown }),
  shapeOf({ path: isString, in: isList }),
);

const isJsonField: Guard<FormJsonField> = shapeOf({
  kind: oneOf(NuiSmartFormEntryKind.Field),
  type: isString,
  name: isString,
  label: optional(isString),
  description: optional(isString),
  required: optional(isBoolean),
  disabled: optional(isBoolean),
  readonly: optional(isBoolean),
  group: optional(isBoolean),
  area: optional(isString),
  props: optional(isRecord),
  when: optional(isCondition),
  rules: optional(listOf(isJsonRule)),
  validateOn: optional(oneOf(ValidateOn.Submit, ValidateOn.Blur, ValidateOn.Change)),
  keepValue: optional(isBoolean),
});

const isJsonEntry: Guard<FormJsonEntry> = (value): value is FormJsonEntry =>
  isJsonField(value) || isJsonSection(value) || isJsonArray(value);

const isEntries = listOf((value: unknown): value is FormJsonEntry => isJsonEntry(value));

const isJsonSection: Guard<FormJsonSection> = shapeOf({
  kind: oneOf(NuiSmartFormEntryKind.Section),
  name: optional(isString),
  title: isString,
  description: optional(isString),
  layout: optional(isString),
  area: optional(isString),
  when: optional(isCondition),
  fields: isEntries,
});

const isJsonArray: Guard<FormJsonArray> = shapeOf({
  kind: oneOf(NuiSmartFormEntryKind.Array),
  name: isString,
  label: optional(isString),
  description: optional(isString),
  area: optional(isString),
  when: optional(isCondition),
  layout: optional(isString),
  min: optional(isNumber),
  max: optional(isNumber),
  reorderable: optional(isBoolean),
  newRow: isRecord,
  fields: isEntries,
  addLabel: optional(isString),
});

const regExpOf = (source: string, flags: string | undefined): RegExp | undefined => {
  try {
    return new RegExp(source, flags);
  } catch {
    return undefined;
  }
};

const ruleOf = (spec: FormJsonRule): FieldRule | undefined => {
  switch (spec.rule) {
    case FormJsonRuleName.Required:
      return required({ message: spec.message });
    case FormJsonRuleName.Email:
      return email({ message: spec.message });
    case FormJsonRuleName.Min:
      return min(spec.limit, { message: spec.message });
    case FormJsonRuleName.Max:
      return max(spec.limit, { message: spec.message });
    case FormJsonRuleName.Pattern: {
      const expression = regExpOf(spec.source, spec.flags);

      return expression === undefined ? undefined : pattern(expression, { message: spec.message });
    }
  }
};

const conditionOf = <S extends object>(spec: FormJsonCondition): NuiSmartFormCondition<S> => {
  if ('in' in spec) {
    return (values) => spec.in.some((candidate) => Object.is(getAt(values, spec.path), candidate));
  }
  return (values) => Object.is(getAt(values, spec.path), spec.equals);
};

const rowsSelector = <S extends object>(
  path: string,
): FieldSelector<S, readonly JsonRow[] | undefined> => {
  const read = byPath(path);

  return (values) => {
    const value = read(values);
    return isRows(value) ? value : undefined;
  };
};

const fieldRules = <S extends object>(
  builder: Builder<S>,
  path: string,
  specs: readonly FormJsonRule[] | undefined,
  at: string,
): readonly AnyFieldRule<unknown, S>[] | undefined =>
  specs?.flatMap((spec, index) => {
    const rule = ruleOf(spec);

    if (rule === undefined) {
      builder.issues.push({
        path: `${at}.rules.${index}`,
        code: FormConfigIssueCode.InvalidPattern,
      });

      return [];
    }

    return [
      adaptRule(rule, (_value: unknown, values: S) => [getAt(values, path), values] as const),
    ];
  });

const buildField = <S extends object>(
  builder: Builder<S>,
  spec: FormJsonField,
  at: string,
): NuiSmartFormEntry<S> | undefined => {
  const entry = builder.controls[spec.type];

  if (entry === undefined) {
    builder.issues.push({
      path: `${at}.type`,
      code: FormConfigIssueCode.UnknownType,
      type: spec.type,
    });

    return undefined;
  }
  const props = spec.props ?? {};

  if (!entry.props(props)) {
    builder.issues.push({
      path: `${at}.props`,
      code: FormConfigIssueCode.RejectedProps,
      type: spec.type,
    });

    return undefined;
  }
  const { kind, type: _type, name, when, rules, props: _props, ...rest } = spec;

  return {
    ...rest,
    kind,
    component: entry.component,
    model: entry.model,
    name: byPath(name),
    props,
    when: when === undefined ? undefined : conditionOf<S>(when),
    rules: fieldRules<S>(builder, name, rules, at),
  };
};

const buildArray = <S extends object>(
  builder: Builder<S>,
  spec: FormJsonArray,
  at: string,
): NuiSmartFormEntry<S> => {
  const { kind: _kind, name, when, newRow, fields, ...rest } = spec;
  const rowEntries = rowBuilder(builder, `${at}.fields`).entries(fields, `${at}.fields`);
  const { array } = formConfig<S>();

  return {
    ...array(rowsSelector<S>(name), {
      ...rest,
      newRow: () => cloneValue(newRow),
      fields: rowEntries,
    }),
    when: when === undefined ? undefined : conditionOf<S>(when),
  };
};

const buildSection = <S extends object>(
  builder: Builder<S>,
  spec: FormJsonSection,
  at: string,
): NuiSmartFormEntry<S> => {
  const { when, fields, ...rest } = spec;

  return {
    ...rest,
    when: when === undefined ? undefined : conditionOf<S>(when),
    fields: builder.entries(fields, `${at}.fields`),
  };
};

const createBuilder = <S extends object>(
  controls: NuiControlRegistry,
  issues: FormConfigIssue[],
): Builder<S> => {
  const builder: Builder<S> = {
    issues,
    controls,
    entries: (list, at) =>
      list.flatMap((spec, index) => {
        const here = `${at}.${index}`;

        switch (spec.kind) {
          case NuiSmartFormEntryKind.Field: {
            const built = buildField(builder, spec, here);
            return built === undefined ? [] : [built];
          }
          case NuiSmartFormEntryKind.Section:
            return [buildSection(builder, spec, here)];
          case NuiSmartFormEntryKind.Array:
            return [buildArray(builder, spec, here)];
        }
      }),
  };

  return builder;
};

const rowBuilder = <S extends object>(parent: Builder<S>, _at: string): Builder<JsonRow> =>
  createBuilder<JsonRow>(parent.controls, parent.issues);

const shapeIssues = (input: unknown): FormConfigIssue[] => {
  if (!Array.isArray(input)) {
    return [{ path: 'fields', code: FormConfigIssueCode.NotAList }];
  }
  return input.flatMap((entry: unknown, index) =>
    isJsonEntry(entry) ? [] : [{ path: `fields.${index}`, code: FormConfigIssueCode.InvalidEntry }],
  );
};

export const parseFormConfig = <S extends object>(
  input: unknown,
  options: ParseFormConfigOptions,
): ParsedFormConfig<S> => {
  const shape = shapeIssues(input);

  if (shape.length > 0 || !isEntries(input)) {
    return { kind: FormConfigResultKind.Error, issues: shape };
  }
  const issues: FormConfigIssue[] = [];
  const fields = createBuilder<S>(options.controls, issues).entries(input, 'fields');

  return issues.length > 0
    ? { kind: FormConfigResultKind.Error, issues }
    : { kind: FormConfigResultKind.Ok, fields };
};
