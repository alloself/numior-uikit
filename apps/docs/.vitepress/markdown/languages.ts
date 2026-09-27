export const CODE_LANGUAGES = [
  'ts',
  'js',
  'vue',
  'html',
  'css',
  'json',
  'bash',
  'md',
  'yaml',
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const isCodeLanguage = (value: string): value is CodeLanguage =>
  CODE_LANGUAGES.some((language) => language === value);
