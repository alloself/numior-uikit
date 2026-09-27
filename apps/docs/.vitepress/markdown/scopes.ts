import type { NuiSyntaxScope } from '@numior/vue';

const SCOPE_RULES: ReadonlyArray<readonly [RegExp, NuiSyntaxScope]> = [
  [/^comment/, 'comment'],
  [/^string|^punctuation\.definition\.string/, 'string'],
  [/^constant\.numeric/, 'number'],
  [/^entity\.name\.tag|^punctuation\.definition\.tag/, 'tag'],
  [/^entity\.other\.attribute-name/, 'attribute'],
  [/^entity\.name\.function|^support\.function|^meta\.function-call/, 'function'],
  [/^entity\.name\.(type|class)|^support\.(type|class)(?!\.property-name)/, 'type'],
  [
    /^support\.type\.property-name|^variable\.other\.property|^meta\.object-literal\.key/,
    'property',
  ],
  [/^keyword\.operator|^punctuation|^meta\.brace/, 'punctuation'],
  [/^keyword|^storage\.(type|modifier)|^constant\.language/, 'keyword'],
  [/^variable/, 'variable'],
];

export const scopeOf = (scopes: readonly string[]): NuiSyntaxScope | undefined => {
  for (const scope of scopes.toReversed()) {
    const rule = SCOPE_RULES.find(([pattern]) => pattern.test(scope));

    if (rule !== undefined) {
      return rule[1];
    }
  }
  return undefined;
};
