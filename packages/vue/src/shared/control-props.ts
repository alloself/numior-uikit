import type { PropType } from 'vue';
import type { NuiSize } from './types';

/**
 * Props shared by form controls. The booleans default to undefined instead of false so
 * that a surrounding NuiField can decide; an explicit value on the control still wins.
 */
export const fieldControlProps = {
  id: { type: String as PropType<string | undefined>, default: undefined },
  size: { type: String as PropType<NuiSize | undefined>, default: 'md' },
  disabled: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  required: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  invalid: { type: Boolean as PropType<boolean | undefined>, default: undefined },
};
