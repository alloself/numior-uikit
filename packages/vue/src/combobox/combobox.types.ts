import type { FloatingPlacement } from '@numior/primitives';
import type { NuiOption, NuiOptionKey, NuiOptionSource } from '../shared/options';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export type ComboboxDraft =
  | { readonly kind: typeof ComboboxDraftKind.Label }
  | { readonly kind: typeof ComboboxDraftKind.Typed; readonly text: string };

export type NuiComboboxFilter<T> = (option: NuiOption<T>, query: string) => boolean;

export interface NuiComboboxProps<T> extends NuiFieldControlProps {
  options: NuiOptionSource<T>;
  multiple?: boolean | undefined;
  clearable?: boolean | undefined;
  placeholder?: string | undefined;
  name?: string | undefined;
  getKey?: NuiOptionKey<T> | undefined;
  filter?: NuiComboboxFilter<T> | false | undefined;
  loading?: boolean | undefined;
  loop?: boolean | undefined;
  locale?: string | undefined;
  customValue?: ((text: string) => T) | undefined;
  placement?: FloatingPlacement | undefined;
  emptyLabel?: string | undefined;
  loadingLabel?: string | undefined;
  clearLabel?: string | undefined;
  removeLabel?: string | undefined;
  toggleLabel?: string | undefined;
}

export const ComboboxDraftKind = { Label: 'label', Typed: 'typed' } as const;
