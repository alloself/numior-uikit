export interface PendingUpload {
  readonly id: string;
  readonly pos: number;
}

export type UploadChange =
  | { readonly kind: 'add'; readonly uploads: readonly PendingUpload[] }
  | { readonly kind: 'drop'; readonly ids: readonly string[] };
