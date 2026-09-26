import { describe, expect, it } from 'vitest';
import type { NuiMessageCatalog } from '@numior/primitives';
import type { NuiFormsMessages } from '../src';
import { fieldArrayMessages } from '../src/components/field-array/field-array.messages';
import { formMessages } from '../src/components/form/form.messages';
import { smartFormMessages } from '../src/components/smart-form/smart-form.messages';
import { formRulesMessages } from '../src/rules/form-rules.messages';

const catalogs: { readonly [N in keyof NuiFormsMessages]: NuiMessageCatalog<N> } = {
  fieldArray: fieldArrayMessages,
  form: formMessages,
  formRules: formRulesMessages,
  smartForm: smartFormMessages,
};

const untranslated = (): string[] =>
  Object.values(catalogs).flatMap((catalog) =>
    Object.entries(catalog.en).flatMap(([key, english]) => {
      const russian: unknown = Reflect.get(catalog.ru, key);
      const path = `${catalog.namespace}.${key}`;

      if (typeof russian !== typeof english) {
        return [`${path}: ${typeof english} in English, ${typeof russian} in Russian`];
      }

      return typeof english === 'string' && (english === '' || russian === english) ? [path] : [];
    }),
  );

describe('built-in texts of @numior/forms', () => {
  it('registers one catalog per namespace under its own name', () => {
    expect(Object.values(catalogs).map((catalog) => catalog.namespace)).toEqual(
      Object.keys(catalogs),
    );
  });

  it('translates every English text into Russian with the same shape', () => {
    expect(untranslated()).toEqual([]);
  });
});
