export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export type UploadReason = 'type' | 'size' | 'count' | 'custom' | 'upload';

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
  | { readonly status: 'queued' }
  | { readonly status: 'uploading'; readonly progress: number }
  | { readonly status: 'done'; readonly result?: R | undefined }
  | { readonly status: 'error'; readonly error: UploadError };

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
