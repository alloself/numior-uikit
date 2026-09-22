import type { IconRegistry } from '@numior/primitives';
import { Check, ChevronDown, LoaderCircle, Minus, Search, X } from 'lucide-vue-next';

/** Kit defaults from Lucide (ISC). Any registry provided by the app overrides an alias. */
export const defaultIcons: IconRegistry = {
  check: Check,
  minus: Minus,
  loader: LoaderCircle,
  'chevron-down': ChevronDown,
  x: X,
  search: Search,
};
