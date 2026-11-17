import type { NuiCodeLanguage } from '../highlight/highlight.types';
import type { BundledTheme } from 'shiki';

export interface ShikiHighlighterOptions {
  readonly languages?: readonly NuiCodeLanguage[] | undefined;
  readonly theme?: BundledTheme | undefined;
}
