import type { UploadAdapter, UploadError, UploadItem } from '@numior/primitives';
import type { NuiAvatarShape, NuiAvatarSize } from '../avatar/avatar.types';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export type NuiUploadItem<R = unknown> = UploadItem<R>;
export type NuiUploadAdapter<R = unknown> = UploadAdapter<R>;
export type NuiUploadError = UploadError;
export type NuiUploadLayout = (typeof NuiUploadLayout)[keyof typeof NuiUploadLayout];
export type NuiUploadRejected = (typeof NuiUploadRejected)[keyof typeof NuiUploadRejected];
export type NuiUploadVariant = (typeof NuiUploadVariant)[keyof typeof NuiUploadVariant];

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
  variant?: NuiUploadVariant | undefined;
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
  disabled?: boolean | undefined;
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

export interface NuiAvatarUploadProps<R = unknown> extends Omit<NuiFieldControlProps, 'size'> {
  upload: NuiUploadAdapter<R>;
  accept?: string | undefined;
  maxSize?: number | undefined;
  validate?: ((file: File) => string | undefined) | undefined;
  name?: string | undefined;
  shape?: NuiAvatarShape | undefined;
  size?: NuiAvatarSize | undefined;
  chooseLabel?: string | undefined;
  changeLabel?: string | undefined;
  retryLabel?: string | undefined;
  removeLabel?: string | undefined;
  errorLabel?: ((error: NuiUploadError, item: NuiUploadItem<R>) => string) | undefined;
}

export type AvatarNotice =
  | { readonly kind: typeof AvatarNoticeKind.Silent }
  | { readonly kind: typeof AvatarNoticeKind.Done; readonly text: string }
  | { readonly kind: typeof AvatarNoticeKind.Failure; readonly text: string };

export const NuiUploadLayout = { List: 'list', Grid: 'grid' } as const;

export const NuiUploadRejected = { List: 'list', Drop: 'drop' } as const;

export const NuiUploadVariant = { Zone: 'zone', Button: 'button' } as const;

export const AvatarNoticeKind = { Silent: 'silent', Done: 'done', Failure: 'failure' } as const;
