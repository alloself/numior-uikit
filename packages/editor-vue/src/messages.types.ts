import type { NuiEditorMessages } from './editor/editor.messages';

export interface NuiEditorPackageMessages {
  readonly editor: NuiEditorMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiEditorPackageMessages {}
}
