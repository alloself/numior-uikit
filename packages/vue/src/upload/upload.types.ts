import type { UploadAdapter, UploadError, UploadItem } from '@numior/primitives';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export type NuiUploadItem<R = unknown> = UploadItem<R>;
export type NuiUploadAdapter<R = unknown> = UploadAdapter<R>;
export type NuiUploadError = UploadError;
export type NuiUploadLayout = 'list' | 'grid';
export type NuiUploadRejected = 'list' | 'drop';

export interface NuiUploadProps<R = unknown> extends NuiFieldControlProps {
  upload: NuiUploadAdapter<R>;
  accept?: string | undefined;
  multiple?: boolean | undefined;
  maxSize?: number | undefined;
  maxFiles?: number | undefined;
  validate?: ((file: File) => string | undefined) | undefined;
  rejected?: NuiUploadRejected | undefined;
  auto?: boolean | undefined;
  concurrency?: number | undefined;
  layout?: NuiUploadLayout | undefined;
  dropLabel?: string | undefined;
  browseLabel?: string | undefined;
  cancelLabel?: string | undefined;
  retryLabel?: string | undefined;
  removeLabel?: string | undefined;
  doneLabel?: string | undefined;
  errorLabel?: ((error: NuiUploadError, item: NuiUploadItem<R>) => string) | undefined;
}

export interface NuiUploadRowProps<R = unknown> {
  item: NuiUploadItem<R>;
  preview?: string | undefined;
  description: string;
  cancelLabel: string;
  retryLabel: string;
  removeLabel: string;
}

export interface NuiUploadItemSlot<R = unknown> {
  item: NuiUploadItem<R>;
  preview: string | undefined;
  cancel: () => void;
  retry: () => void;
  remove: () => void;
}

export interface NuiUploadZoneSlot {
  open: () => void;
  dragging: boolean;
}
