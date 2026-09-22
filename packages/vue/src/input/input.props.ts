import type { ExtractPublicPropTypes, PropType } from 'vue';
import { fieldControlProps } from '../shared/control-props';

/** Text-like input types; numbers, dates and files get dedicated components. */
export type NuiInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

export const inputProps = {
  ...fieldControlProps,
  type: { type: String as PropType<NuiInputType | undefined>, default: 'text' },
  readonly: { type: Boolean as PropType<boolean | undefined>, default: false },
};

export type NuiInputProps = ExtractPublicPropTypes<typeof inputProps>;

/** v-model modifiers understood by NuiInput. */
export type NuiInputModifiers = Partial<Record<'lazy' | 'trim', true>>;
