import { computed } from 'vue';
import { FORM_HOST, type FormContext } from '../../form/form-context';
import { entryPath } from './items';
import type { NuiSmartFormEntry } from './smart-form.types';

export const isShown = <T>(entry: NuiSmartFormEntry<T>, values: T): boolean =>
  entry.when?.(values, undefined) ?? true;

export const declareEntries = <T extends object>(
  form: FormContext<T>,
  entries: readonly NuiSmartFormEntry<T>[],
  parent: () => boolean = () => true,
): void => {
  const { raw, values } = form[FORM_HOST].engine;

  for (const entry of entries) {
    const shown = computed(() => parent() && isShown(entry, values));
    const active = (): boolean => shown.value;

    if (entry.kind === 'section') {
      declareEntries(form, entry.fields, active);
    } else {
      form.register(() => entryPath(raw, entry), {
        kind: entry.kind === 'array' ? 'group' : 'field',
        active,
        keepValue: entry.kind === 'field' ? entry.keepValue : true,
      });
    }
  }
};
