export type NuiPluralForms = Readonly<Partial<Record<Intl.LDMLPluralRule, string>>> & {
  readonly other: string;
};

const rules = new Map<string, Intl.PluralRules>();

const pluralRules = (language: string): Intl.PluralRules => {
  const cached = rules.get(language);

  if (cached) {
    return cached;
  }

  const created = new Intl.PluralRules(language);

  rules.set(language, created);
  return created;
};

export const plural = (language: string, count: number, forms: NuiPluralForms): string =>
  forms[pluralRules(language).select(count)] ?? forms.other;
