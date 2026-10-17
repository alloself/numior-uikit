import type { NuiContentMessages } from './media.messages';

export interface NuiContentPackageMessages {
  readonly content: NuiContentMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiContentPackageMessages {}
}
