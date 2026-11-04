import type { NodeId } from '@numior/editor-core';
import type { UploadAdapter, UploadItem } from '@numior/primitives';
import { type NuiContentNodeType } from '@numior/content';

export interface NuiEditorUploaded {
  readonly url: string;
}

export type NuiEditorUploadAdapter = UploadAdapter<NuiEditorUploaded>;

export type NuiEditorUploadItem = UploadItem<NuiEditorUploaded>;

export type UploadTarget =
  | {
      readonly kind: typeof UploadTargetKind.Place;
      readonly pos: number;
      readonly at: number | undefined;
    }
  | { readonly kind: typeof UploadTargetKind.Replace; readonly id: NodeId };

export type UploadKind = typeof NuiContentNodeType.Image | typeof NuiContentNodeType.File;

export type MediaKind =
  | UploadKind
  | typeof NuiContentNodeType.Embed
  | typeof NuiContentNodeType.Bookmark;

export interface UploadCard {
  readonly item: NuiEditorUploadItem;
  readonly element: HTMLElement;
  readonly preview: string | undefined;
}

export const UploadTargetKind = { Place: 'place', Replace: 'replace' } as const;

export const MediaTab = { Upload: 'upload', Link: 'link' } as const;
