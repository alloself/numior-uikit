import type { CellError } from '../cell.types';

export class CellErrorSignal extends Error {
  readonly code: CellError;

  constructor(code: CellError) {
    super();
    this.code = code;
  }
}

const SIGNALS = new Map<CellError, CellErrorSignal>();

export const raise = (code: CellError): never => {
  const signal = SIGNALS.get(code) ?? new CellErrorSignal(code);

  SIGNALS.set(code, signal);
  throw signal;
};
