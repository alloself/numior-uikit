import type { FileRejection, UploadError } from './upload.types';

export interface ValidateFilesOptions {
  readonly accept?: string | undefined;
  readonly maxSize?: number | undefined;
  readonly maxFiles?: number | undefined;
  readonly existing?: number | undefined;
  readonly validate?: ((file: File) => string | undefined) | undefined;
}

export interface ValidatedFiles {
  readonly accepted: File[];
  readonly rejected: FileRejection[];
}

const acceptTokens = (accept: string | undefined): string[] =>
  (accept ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== '');

const matchesToken = (file: File, token: string): boolean => {
  const type = file.type.toLowerCase();

  if (token.startsWith('.')) {
    return file.name.toLowerCase().endsWith(token);
  }

  if (token.endsWith('/*')) {
    return type.startsWith(token.slice(0, -1));
  }

  return type === token;
};

const isAccepted = (file: File, tokens: readonly string[]): boolean =>
  tokens.length === 0 || tokens.some((token) => matchesToken(file, token));

const errorFor = (
  file: File,
  options: ValidateFilesOptions,
  tokens: readonly string[],
  room: number,
): UploadError | undefined => {
  if (!isAccepted(file, tokens)) {
    return { reason: 'type' };
  }

  if (options.maxSize !== undefined && file.size > options.maxSize) {
    return { reason: 'size' };
  }

  if (room <= 0) {
    return { reason: 'count' };
  }

  const message = options.validate?.(file);

  return message === undefined ? undefined : { reason: 'custom', message };
};

export const validateFiles = (
  files: readonly File[],
  options: ValidateFilesOptions = {},
): ValidatedFiles => {
  const tokens = acceptTokens(options.accept);
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];

  let room =
    options.maxFiles === undefined
      ? Number.POSITIVE_INFINITY
      : options.maxFiles - (options.existing ?? 0);

  for (const file of files) {
    const error = errorFor(file, options, tokens, room);

    if (error) {
      rejected.push({ file, error });
    } else {
      accepted.push(file);
      room -= 1;
    }
  }

  return { accepted, rejected };
};
