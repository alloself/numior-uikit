export type Bytes = Uint8Array<ArrayBuffer>;

export interface ZipCodec {
  inflate(): ReadableWritablePair<Bytes, Bytes>;
  deflate(): ReadableWritablePair<Bytes, Bytes>;
}

export type ZipFailure = (typeof ZipFailure)[keyof typeof ZipFailure];

export interface ZipRawEntry {
  readonly method: number;
  readonly crc: number;
  readonly size: number;
  readonly data: Bytes;
}

export interface ZipArchive {
  readonly names: readonly string[];
  has(name: string): boolean;
  stream(name: string): ReadableStream<Bytes>;
  bytes(name: string): Promise<Bytes>;
  text(name: string): Promise<string>;
  raw(name: string): ZipRawEntry | undefined;
}

export type ZipRead =
  | { readonly ok: true; readonly archive: ZipArchive }
  | { readonly ok: false; readonly reason: ZipFailure };

export type ZipWriteEntry =
  | {
      readonly name: string;
      readonly data: Bytes | ReadableStream<Bytes>;
      readonly store?: boolean | undefined;
    }
  | { readonly name: string; readonly copy: ZipRawEntry };

export interface ZipReadOptions {
  readonly maxSize?: number | undefined;
}

export interface ZipOptions {
  readonly codec?: ZipCodec | undefined;
  readonly signal?: AbortSignal | undefined;
}

export const ZipFailure = {
  NotZip: 'not-zip',
  Damaged: 'damaged',
  Encrypted: 'encrypted',
  UnsupportedMethod: 'unsupported-method',
  TooLarge: 'too-large',
} as const;
