import type { DOMWrapper, VueWrapper } from '@vue/test-utils';

export interface FieldTexts {
  readonly label: string | undefined;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly linked: boolean;
  readonly group: boolean;
}

const textOf = (wrapper: VueWrapper, selector: string): string | undefined => {
  const part = wrapper.find(selector);

  return part.exists() ? part.text().replace(/\*$/, '').trim() : undefined;
};

const describedIds = (wrapper: VueWrapper): string[] => {
  const described = wrapper.find('[aria-describedby]');

  return (described.exists() ? (described.attributes('aria-describedby') ?? '') : '')
    .split(' ')
    .filter(Boolean);
};

const labelLinked = (wrapper: VueWrapper, label: DOMWrapper<Element>): boolean => {
  if (!label.exists()) {
    return true;
  }
  const target = label.attributes('for');
  const labelled = wrapper.find('[aria-labelledby]');

  return (
    (target !== undefined && wrapper.find(`#${target}`).exists()) ||
    (labelled.exists() && labelled.attributes('aria-labelledby') === label.attributes('id'))
  );
};

const partLinked = (wrapper: VueWrapper, ids: readonly string[], selector: string): boolean => {
  const part = wrapper.find(selector);

  return !part.exists() || ids.includes(part.attributes('id') ?? '');
};

export const fieldTextsOf = (wrapper: VueWrapper): FieldTexts => {
  const field = wrapper.find('.nui-field');
  const ids = describedIds(wrapper);

  return {
    label: textOf(wrapper, '.nui-field__label'),
    description: textOf(wrapper, '.nui-field__description'),
    error: textOf(wrapper, '.nui-field__error'),
    linked:
      field.exists() &&
      labelLinked(wrapper, wrapper.find('.nui-field__label')) &&
      partLinked(wrapper, ids, '.nui-field__description') &&
      partLinked(wrapper, ids, '.nui-field__error'),
    group: field.exists() && field.element.tagName === 'FIELDSET',
  };
};
