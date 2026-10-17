import type { NodeId } from '@numior/editor-core';
import type { UploadAdapter, UploadItem } from '@numior/primitives';

export interface NuiEditorUploaded {
  readonly url: string;
}

export type NuiEditorUploadAdapter = UploadAdapter<NuiEditorUploaded>;

export type NuiEditorUploadItem = UploadItem<NuiEditorUploaded>;

export type UploadTarget =
  | { readonly kind: 'place'; readonly pos: number }
  | { readonly kind: 'replace'; readonly id: NodeId };

export type UploadKind = 'image' | 'file';

export type MediaKind = UploadKind | 'embed' | 'bookmark';

export interface UploadCard {
  readonly item: NuiEditorUploadItem;
  readonly element: HTMLElement;
  readonly preview: string | undefined;
}
