import type { SliceJob } from './slicer';
import type { TablePhase } from './engine.types';

export interface PipelineStage {
  readonly phase: TablePhase;
  readonly job: SliceJob;
  readonly next: () => PipelineStage | null;
}

export interface Pipeline extends SliceJob {
  phase(): TablePhase;
}

export const createPipeline = (
  first: PipelineStage | null,
  onStageDone?: (stage: PipelineStage) => void,
): Pipeline | null => {
  if (first === null) {
    return null;
  }
  let stage: PipelineStage | null = first;
  let last: PipelineStage = first;

  return {
    phase: () => (stage ?? last).phase,
    total: () => (stage ?? last).job.total(),
    done: () => (stage ?? last).job.done(),
    waiting: () => stage?.job.waiting?.(),
    work: (deadline) => {
      while (stage !== null) {
        if (!stage.job.work(deadline)) {
          return false;
        }
        onStageDone?.(stage);
        stage = stage.next();

        if (stage !== null) {
          last = stage;

          if (performance.now() >= deadline) {
            return false;
          }
        }
      }
      return true;
    },
  };
};
