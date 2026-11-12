import type { Attrs, Command, ElementNode, Keymap, NodeId, PeerSpot } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';
import type { Component } from 'vue';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { SlashItem } from '../slash/slash-items';

export type GripSide = (typeof GripSide)[keyof typeof GripSide];

export type GripEdge = (typeof GripEdge)[keyof typeof GripEdge];

export interface NuiEditorBlockContext {
  setAttrs(attrs: Attrs): boolean;
  remove(): boolean;
  run(command: Command): boolean;
  focus(): void;
  enter(): void;
  setStyle(property: string, value: string | null): void;
  element(): HTMLElement | undefined;
  peers(): readonly PeerSpot[];
  setSpot(part: readonly string[]): void;
  leaveSpot(): void;
}

export interface NuiEditorBlockHost {
  readonly run: (command: Command) => boolean;
  readonly focus: () => void;
  readonly peers: (block: NodeId) => readonly PeerSpot[];
}

export interface NuiEditorBlockViewProps {
  node: ElementNode;
  element: HTMLElement;
  selected: boolean;
  focused: boolean;
  editable: boolean;
  editor: NuiEditorBlockContext;
}

export type NuiEditorBlockPlace = (typeof NuiEditorBlockPlace)[keyof typeof NuiEditorBlockPlace];

export type NuiEditorHandlePlacement =
  (typeof NuiEditorHandlePlacement)[keyof typeof NuiEditorHandlePlacement];

export interface NuiEditorBlockEditor {
  element(id: NodeId): HTMLElement | undefined;
}

export interface NuiEditorBlock {
  readonly name: string;
  readonly view?: Component | undefined;
  readonly at?: NuiEditorBlockPlace | undefined;
  readonly handle?:
    | NuiEditorHandlePlacement
    | ((node: ElementNode) => NuiEditorHandlePlacement)
    | undefined;
  readonly keymap?: Keymap | ((editor: NuiEditorBlockEditor) => Keymap) | undefined;
  readonly conceals?:
    | ((editor: NuiEditorBlockEditor) => (parent: ElementNode, index: number) => boolean)
    | undefined;
  readonly slash?: ((texts: NuiEditorMessages) => readonly SlashItem[]) | undefined;
  readonly menu?:
    | ((
        node: ElementNode,
        editor: NuiEditorBlockContext,
        texts: NuiEditorMessages,
      ) => NuiMenuEntry[])
    | undefined;
}

export const NuiEditorBlockPlace = { Start: 'start', End: 'end' } as const;

export const NuiEditorHandlePlacement = { Push: 'push', Beside: 'beside' } as const;

export const GripSide = { Start: 'start', End: 'end' } as const;

export const GripEdge = { Top: 'top', Bottom: 'bottom' } as const;

export const ImageActionKey = { Replace: 'replace', Download: 'download', Alt: 'alt' } as const;
