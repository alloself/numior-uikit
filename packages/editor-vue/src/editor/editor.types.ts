import type { NuiEmbedPresetId, NuiEmbedProvider } from '@numior/content';
import type {
  Command,
  DocJSON,
  EditorState,
  IdSource,
  PasteSource,
  Plugin,
  Schema,
} from '@numior/editor-core';
import type { CaretRect } from '@numior/editor-core/view';
import type { NuiHighlighter } from '@numior/primitives';
import type { NuiFieldControlProps } from '@numior/vue';
import type { NuiEditorBlock } from '../blocks/block.types';
import type { NuiEditorLinkMetadata } from '../links/links.types';
import type { NuiEditorMentions } from '../mentions/mentions.types';
import type { NuiEditorSelectionAction } from '../toolbar/toolbar-items';
import type { NuiEditorUploadAdapter } from '../uploads/uploads.types';

export type NuiEditorFormat = (typeof NuiEditorFormat)[keyof typeof NuiEditorFormat];

export type NuiEditorValue = string | DocJSON;

export interface NuiEditorProps extends NuiFieldControlProps {
  format?: NuiEditorFormat | undefined;
  schema?: Schema | undefined;
  placeholder?: string | undefined;
  autofocus?: boolean | undefined;
  toolbar?: NuiEditorToolbarMode | undefined;
  selectionActions?: readonly NuiEditorSelectionAction[] | undefined;
  colours?: readonly string[] | undefined;
  highlights?: readonly string[] | undefined;
  blockHandles?: boolean | undefined;
  blocks?: readonly NuiEditorBlock[] | undefined;
  highlighter?: NuiHighlighter | false | undefined;
  upload?: NuiEditorUploadAdapter | undefined;
  embeds?: readonly (NuiEmbedPresetId | NuiEmbedProvider)[] | undefined;
  linkMetadata?: NuiEditorLinkMetadata | undefined;
  mentions?: NuiEditorMentions | undefined;
  accept?: string | undefined;
  maxSize?: number | undefined;
  maxHeight?: string | undefined;
  plugins?: readonly Plugin[] | undefined;
  ids?: IdSource | undefined;
}

export type NuiEditorToolbarMode = (typeof NuiEditorToolbarMode)[keyof typeof NuiEditorToolbarMode];

export interface NuiEditorApi {
  state(): EditorState | undefined;
  run(command: Command): boolean;
  focus(): void;
  flush(): void;
  coordsAt(pos: number): CaretRect | undefined;
  posAt(x: number, y: number): number | undefined;
  contentBox(): DOMRect | undefined;
  revealNode(id: string): void;
  watchLayout(listener: () => void): () => void;
}

export interface NuiEditorPaste {
  readonly source: PasteSource;
}

export const NuiEditorFormat = { Html: 'html', Json: 'json' } as const;

export const NuiEditorToolbarMode = {
  Fixed: 'fixed',
  Bubble: 'bubble',
  Both: 'both',
  None: 'none',
} as const;

export const KeyCode = { K: 'KeyK' } as const;

export const CssDisplay = { ListItem: 'list-item' } as const;

export const DomAttr = { Class: 'class', ContentEditable: 'contenteditable' } as const;

export const PlayState = { Running: 'running' } as const;
