import type { Attrs, Command, ElementNode, Keymap, NodeId } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';
import type { Component } from 'vue';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { SlashItem } from '../slash/slash-items';

export interface NuiEditorBlockContext {
  setAttrs(attrs: Attrs): boolean;
  remove(): boolean;
  run(command: Command): boolean;
  focus(): void;
  setStyle(property: string, value: string | null): void;
  element(): HTMLElement | undefined;
}

export interface NuiEditorBlockViewProps {
  node: ElementNode;
  element: HTMLElement;
  selected: boolean;
  focused: boolean;
  editable: boolean;
  editor: NuiEditorBlockContext;
}

export type NuiEditorBlockPlace = 'start' | 'end';

export type NuiEditorHandlePlacement = 'push' | 'beside';

export interface NuiEditorBlockEditor {
  element(id: NodeId): HTMLElement | undefined;
}

export interface NuiEditorBlock {
  readonly name: string;
  readonly view?: Component | undefined;
  readonly at?: NuiEditorBlockPlace | undefined;
  readonly handle?: NuiEditorHandlePlacement | undefined;
  readonly keymap?: Keymap | ((editor: NuiEditorBlockEditor) => Keymap) | undefined;
  readonly slash?: ((texts: NuiEditorMessages) => readonly SlashItem[]) | undefined;
  readonly menu?:
    | ((
        node: ElementNode,
        editor: NuiEditorBlockContext,
        texts: NuiEditorMessages,
      ) => NuiMenuEntry[])
    | undefined;
}
