import type { Attrs, Command, ElementNode, Keymap } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';
import type { Component } from 'vue';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { SlashItem } from '../slash/slash-items';

export interface NuiEditorBlockContext {
  setAttrs(attrs: Attrs): boolean;
  remove(): boolean;
  run(command: Command): boolean;
  focus(): void;
}

export interface NuiEditorBlockViewProps {
  node: ElementNode;
  element: HTMLElement;
  selected: boolean;
  editable: boolean;
  editor: NuiEditorBlockContext;
}

export type NuiEditorBlockPlace = 'start' | 'end';

export interface NuiEditorBlock {
  readonly name: string;
  readonly view?: Component | undefined;
  readonly at?: NuiEditorBlockPlace | undefined;
  readonly keymap?: Keymap | undefined;
  readonly slash?: ((texts: NuiEditorMessages) => readonly SlashItem[]) | undefined;
  readonly menu?:
    | ((
        node: ElementNode,
        editor: NuiEditorBlockContext,
        texts: NuiEditorMessages,
      ) => NuiMenuEntry[])
    | undefined;
}
