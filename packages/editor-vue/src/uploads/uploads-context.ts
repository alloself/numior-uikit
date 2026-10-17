import type { NodeId } from '@numior/editor-core';
import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { NuiEditorUploadItem } from './uploads.types';

export interface EditorUploadContext {
  readonly enabled: ComputedRef<boolean>;
  readonly replacing: ComputedRef<ReadonlyMap<NodeId, NuiEditorUploadItem>>;
  readonly images: ComputedRef<string | undefined>;
  replace(id: NodeId, file: File): void;
}

const UPLOADS: InjectionKey<EditorUploadContext> = Symbol('nui-editor-uploads');

export const provideEditorUploads = (context: EditorUploadContext): void => {
  provide(UPLOADS, context);
};

export const useEditorUploadContext = (): EditorUploadContext | undefined =>
  inject(UPLOADS, undefined);
