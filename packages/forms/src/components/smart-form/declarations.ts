import type { FormContext } from '../../form/form-context';
import { joinPath } from '../../paths/paths';
import type { NuiSmartFormEntry, SmartScope } from './smart-form.types';

export const isShown = (entry: NuiSmartFormEntry, scope: SmartScope): boolean =>
  entry.when?.(scope.values, scope.row) ?? true;

export const declareEntries = (
  form: FormContext,
  entries: readonly NuiSmartFormEntry[],
  scope: () => SmartScope,
  parent: () => boolean = () => true,
): void => {
  for (const entry of entries) {
    const active = (): boolean => parent() && isShown(entry, scope());

    if (entry.kind === 'section') {
      declareEntries(form, entry.fields, scope, active);
    } else {
      form.register(() => joinPath(scope().prefix, entry.name), {
        kind: entry.kind === 'array' ? 'group' : 'field',
        active,
        keepValue: entry.kind === 'field' ? entry.keepValue : true,
      });
    }
  }
};
