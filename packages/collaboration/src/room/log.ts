import type { WireStep } from '../protocol/protocol.types.ts';

export interface LoggedBatch {
  readonly version: number;
  readonly clientId: string;
  readonly steps: readonly WireStep[];
  readonly sent?: number | undefined;
}

export interface StepLog {
  readonly version: () => number;
  readonly append: (steps: readonly WireStep[], clientId: string, sent: number) => void;
  readonly batchesSince: (from: number) => readonly LoggedBatch[];
}

const firstAfter = (batches: readonly LoggedBatch[], from: number): number => {
  let low = 0;
  let high = batches.length;

  while (low < high) {
    const middle = (low + high) >> 1;
    const batch = batches[middle];

    if (batch !== undefined && batch.version + batch.steps.length <= from) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const cutAt = (batch: LoggedBatch, from: number): LoggedBatch =>
  batch.version >= from
    ? batch
    : {
        version: from,
        clientId: batch.clientId,
        steps: batch.steps.slice(from - batch.version),
      };

const joined = (last: LoggedBatch, next: LoggedBatch): LoggedBatch => ({
  version: last.version,
  clientId: last.clientId,
  steps: [...last.steps, ...next.steps],
  sent: last.sent === undefined || next.sent === undefined ? undefined : last.sent + next.sent,
});

export const createStepLog = (): StepLog => {
  const batches: LoggedBatch[] = [];
  let version = 0;

  return {
    version: () => version,
    append: (steps, clientId, sent) => {
      if (steps.length === 0) {
        return;
      }

      batches.push({ version, clientId, steps, sent });
      version += steps.length;
    },
    batchesSince: (from) =>
      batches.slice(firstAfter(batches, from)).reduce<LoggedBatch[]>((merged, batch) => {
        const last = merged.at(-1);
        const next = cutAt(batch, from);

        if (last?.clientId === next.clientId) {
          merged[merged.length - 1] = joined(last, next);
        } else {
          merged.push(next);
        }
        return merged;
      }, []),
  };
};
