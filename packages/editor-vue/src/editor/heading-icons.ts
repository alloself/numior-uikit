import { Heading1, Heading2, Heading3, Heading4, Heading5, Heading6 } from '@lucide/vue';
import type { NuiContentHeadingLevel } from '@numior/content';
import type { IconSource } from '@numior/primitives';

export const HEADING_ICONS: Readonly<Record<NuiContentHeadingLevel, IconSource>> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
  4: Heading4,
  5: Heading5,
  6: Heading6,
};
