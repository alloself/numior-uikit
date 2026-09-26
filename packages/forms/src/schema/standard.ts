export interface StandardPathSegment {
  readonly key: PropertyKey;
}

export interface StandardIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | StandardPathSegment> | undefined;
}

export type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> };

export interface StandardSchema<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output> | Promise<StandardResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}

export interface FormIssue {
  readonly path: string;
  readonly message: string;
}

export type SchemaOutcome<Output> =
  | { readonly ok: true; readonly output: Output }
  | { readonly ok: false; readonly issues: readonly FormIssue[] };

const keyOf = (segment: PropertyKey | StandardPathSegment): PropertyKey =>
  typeof segment === 'object' ? segment.key : segment;

const isNamed = (key: PropertyKey): key is string | number => typeof key !== 'symbol';

const issuePath = (issue: StandardIssue): string => {
  const keys = (issue.path ?? []).map(keyOf);
  return keys.every(isNamed) ? keys.map(String).join('.') : '';
};

const toFormIssue = (issue: StandardIssue): FormIssue => ({
  path: issuePath(issue),
  message: issue.message,
});

export const toOutcome = <Output>(result: StandardResult<Output>): SchemaOutcome<Output> =>
  result.issues === undefined
    ? { ok: true, output: result.value }
    : { ok: false, issues: result.issues.map(toFormIssue) };
