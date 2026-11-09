import type { RankHost, RankSession } from './rank-host';
import type { SliceJob } from './slicer';
import { createSortJob } from './sort';
import { CollationStage } from './engine.types';

type Stage =
  | { readonly kind: typeof CollationStage.Pack; readonly session: RankSession }
  | { readonly kind: typeof CollationStage.Wait; readonly answer: Promise<Uint32Array | undefined> }
  | { readonly kind: typeof CollationStage.Local; readonly job: SliceJob }
  | { readonly kind: typeof CollationStage.Done };

const WORKER_MIN = 10_000;
const PART_SIZE = 8192;

export const createCollatedSortJob = (
  order: Uint32Array,
  dictionary: readonly string[],
  collator: Intl.Collator,
  host: RankHost | undefined,
): SliceJob => {
  const size = dictionary.length;
  const lengths = new Uint32Array(size);
  let packed = 0;
  let answered: Uint32Array | undefined;
  let failed = false;

  const local = (): Stage => ({
    kind: 'local',
    job: createSortJob(order, (a, b) => collator.compare(dictionary[a] ?? '', dictionary[b] ?? '')),
  });

  const opened = size >= WORKER_MIN ? host?.open(collator) : undefined;
  let stage: Stage = opened === undefined ? local() : { kind: 'pack', session: opened };

  const pack = (session: RankSession, deadline: number): boolean => {
    while (packed < size) {
      const end = Math.min(size, packed + PART_SIZE);
      const part = dictionary.slice(packed, end);

      part.forEach((text, index) => {
        lengths[packed + index] = text.length;
      });

      session.send(part.join(''));
      packed = end;

      if (packed < size && performance.now() >= deadline) {
        return false;
      }
    }

    const answer = session.finish(lengths).then((result) => {
      answered = result;
      failed = result === undefined || result.length !== size;
      return result;
    });

    stage = { kind: 'wait', answer };
    return false;
  };

  const settle = (): boolean => {
    if (failed || answered === undefined) {
      stage = local();
      return false;
    }
    order.set(answered);
    stage = { kind: 'done' };
    return true;
  };

  return {
    total: () => Math.max(1, size),
    done: () => (stage.kind === CollationStage.Done ? size : Math.min(packed, size - 1)),
    waiting: () =>
      stage.kind === CollationStage.Wait && answered === undefined && !failed
        ? stage.answer
        : undefined,
    cancel: () => {
      if (stage.kind === CollationStage.Pack || stage.kind === CollationStage.Wait) {
        opened?.cancel();
      }
    },
    work: (deadline) => {
      switch (stage.kind) {
        case CollationStage.Pack:
          return pack(stage.session, deadline);
        case CollationStage.Wait:
          return answered === undefined && !failed ? false : settle();
        case CollationStage.Local:
          return stage.job.work(deadline);
        case CollationStage.Done:
          return true;
      }
    },
  };
};
