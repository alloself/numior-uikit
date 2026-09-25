export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export type UploadReason = 'type' | 'size' | 'count' | 'custom' | 'upload';

export interface UploadError {
  readonly reason: UploadReason;
  readonly message?: string | undefined;
}

export interface UploadItem<R = unknown> {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly status: UploadStatus;
  readonly progress: number;
  readonly file?: File | undefined;
  readonly url?: string | undefined;
  readonly result?: R | undefined;
  readonly error?: UploadError | undefined;
}

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
