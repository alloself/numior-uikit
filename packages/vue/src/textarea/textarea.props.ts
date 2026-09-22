import type { ExtractPublicPropTypes, PropType } from 'vue';
import { fieldControlProps } from '../shared/control-props';

export type NuiTextareaResize = 'none' | 'vertical' | 'both';

export const textareaProps = {
  ...fieldControlProps,
  rows: { type: Number as PropType<number | undefined>, default: 3 },
  resize: { type: String as PropType<NuiTextareaResize | undefined>, default: 'vertical' },
  readonly: { type: Boolean as PropType<boolean | undefined>, default: false },
};

export type NuiTextareaProps = ExtractPublicPropTypes<typeof textareaProps>;

/** v-model modifiers understood by NuiTextarea. */
export type NuiTextareaModifiers = Partial<Record<'lazy' | 'trim', true>>;
