import type { ExampleFile } from '../examples/example.types';

const EMPTY_FILE: ExampleFile = { name: '', language: undefined, source: '', tokens: undefined };

export const fileNamed = (files: readonly ExampleFile[], name: string): ExampleFile =>
  files.find((file) => file.name === name) ?? files[0] ?? EMPTY_FILE;
