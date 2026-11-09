import type { WireStep } from '../src/protocol/protocol.types.ts';

interface LogEntry {
  readonly step: WireStep;
  readonly clientId: string;
}

export interface LoggedBatch {
  readonly version: number;
  readonly clientId: string;
  readonly steps: readonly WireStep[];
}

export interface StepLog {
  readonly version: () => number;
  readonly append: (steps: readonly WireStep[], clientId: string) => void;
  readonly batchesSince: (from: number) => readonly LoggedBatch[];
}

export const createStepLog = (): StepLog => {
  const entries: LogEntry[] = [];

  return {
    version: () => entries.length,
    append: (steps, clientId) => {
      for (const step of steps) {
        entries.push({ step, clientId });
      }
    },
    batchesSince: (from) =>
      entries.slice(from).reduce<LoggedBatch[]>((batches, entry, index) => {
        const last = batches.at(-1);

        if (last?.clientId === entry.clientId) {
          batches[batches.length - 1] = { ...last, steps: [...last.steps, entry.step] };
        } else {
          batches.push({ version: from + index, clientId: entry.clientId, steps: [entry.step] });
        }
        return batches;
      }, []),
  };
};
