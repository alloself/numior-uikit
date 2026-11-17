import type { NuiSyntaxScope } from '../highlight/highlight.types';

const SCOPE_RULES: ReadonlyArray<readonly [RegExp, NuiSyntaxScope]> = [
  [/^comment/, 'comment'],
  [/^string|^punctuation\.definition\.string/, 'string'],
  [/^constant\.numeric/, 'number'],
  [/^entity\.name\.tag|^punctuation\.definition\.tag|^support\.class\.component/, 'tag'],
  [/^entity\.other\.attribute-name/, 'attribute'],
  [/^entity\.name\.function|^support\.function|^meta\.function-call/, 'function'],
  [/^entity\.name\.(type|class|namespace)|^support\.(type|class)(?!\.property-name)/, 'type'],
  [
    /^support\.type\.property-name|^variable\.other\.property|^variable\.other\.object\.property|^meta\.object-literal\.key/,
    'property',
  ],
  [
    /^keyword\.operator\.(expression|new|typeof|instanceof|delete|void|in|of)\b|^keyword\.control|^keyword\.other|^storage|^constant\.language/,
    'keyword',
  ],
  [/^keyword\.operator|^punctuation|^meta\.brace/, 'punctuation'],
  [/^keyword/, 'keyword'],
  [/^variable|^support\.variable|^support\.constant|^constant\.other/, 'variable'],
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
