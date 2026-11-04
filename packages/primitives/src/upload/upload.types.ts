export type UploadReason = (typeof UploadReason)[keyof typeof UploadReason];

export interface UploadError {
  readonly reason: UploadReason;
  readonly message?: string | undefined;
}

export interface UploadFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly file?: File | undefined;
  readonly url?: string | undefined;
}

export type UploadState<R = unknown> =
  | { readonly status: typeof UploadStatus.Queued }
  | { readonly status: typeof UploadStatus.Uploading; readonly progress: number }
  | { readonly status: typeof UploadStatus.Done; readonly result?: R | undefined }
  | { readonly status: typeof UploadStatus.Error; readonly error: UploadError };

export type UploadItem<R = unknown> = UploadFile & UploadState<R>;

export interface UploadContext {
  readonly onProgress: (fraction: number) => void;
  readonly signal: AbortSignal;
}

export type UploadAdapter<R = unknown> = (file: File, context: UploadContext) => Promise<R>;

export interface FileRejection {
  readonly file: File;
  readonly error: UploadError;
}

export interface UploadEntry {
  readonly file: File;
  readonly error?: UploadError | undefined;
}

export const UploadStatus = {
  Queued: 'queued',
  Uploading: 'uploading',
  Done: 'done',
  Error: 'error',
} as const;

export const UploadReason = {
  Type: 'type',
  Size: 'size',
  Count: 'count',
  Custom: 'custom',
  Upload: 'upload',
} as const;
