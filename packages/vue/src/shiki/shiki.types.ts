import type { NuiCodeLanguage } from '@numior/primitives';
import type { BundledTheme } from 'shiki';

export interface ShikiHighlighterOptions {
  readonly languages?: readonly NuiCodeLanguage[] | undefined;
  readonly theme?: BundledTheme | undefined;
}
