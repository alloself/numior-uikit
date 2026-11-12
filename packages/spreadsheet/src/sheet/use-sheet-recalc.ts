import { useRafFn, useTimeoutFn } from '@vueuse/core';
import { ref } from 'vue';
import type { RecalcOptions, Recalculation } from '../core';
import { RecalcPhase, type SheetRecalc, type SheetRecalcOptions } from './sheet.types';

const SHOW_AFTER_MS = 300;

const shareOf = (run: Recalculation): number => (run.total === 0 ? 0 : run.done / run.total);

export const useSheetRecalc = (options: SheetRecalcOptions): SheetRecalc => {
  const phase = ref<RecalcPhase>(RecalcPhase.Idle);

  const progress = ref(0);

  const revision = ref(0);

  let current: Recalculation | undefined;

  let stopped = false;

  let marking = false;

  let exact = true;

  const redraw = (): void => {
    revision.value += 1;
    options.table.value?.invalidate();
  };

  const tracking = useRafFn(
    () => {
      if (current === undefined) {
        return;
      }
      progress.value = shareOf(current);
      if (exact || !current.planned) {
        return;
      }

      exact = true;
      redraw();
    },
    { immediate: false },
  );

  const reveal = useTimeoutFn(
    () => {
      if (current === undefined || current.finished) {
        return;
      }
      marking = true;
      exact = current.planned;
      progress.value = shareOf(current);
      phase.value = RecalcPhase.Running;
      tracking.resume();
      redraw();
    },
    SHOW_AFTER_MS,
    { immediate: false },
  );

  const settle = async (run: Recalculation): Promise<void> => {
    await run.settled;

    if (run !== current) {
      return;
    }
    current = undefined;
    reveal.stop();
    tracking.pause();

    marking = stopped;
    phase.value = stopped ? RecalcPhase.Stopped : RecalcPhase.Idle;
    redraw();
  };

  const run = (recalc: RecalcOptions = {}): void => {
    const started = options.calculator().recalculate(recalc);

    stopped = false;
    redraw();

    if (started.finished) {
      current = undefined;
      reveal.stop();
      tracking.pause();
      marking = false;
      phase.value = RecalcPhase.Idle;
      return;
    }
    current = started;

    if (phase.value === RecalcPhase.Idle) {
      reveal.start();
    } else {
      marking = true;
      exact = started.planned;
      progress.value = shareOf(started);
      phase.value = RecalcPhase.Running;
      tracking.resume();
    }
    void settle(started);
  };

  const stop = (): void => {
    stopped = true;
    current?.cancel();
  };

  const resume = (): void => {
    run();
  };

  return {
    phase,
    progress,
    revision,
    outdated: (sheet, row, col) => marking && options.calculator().staleAt(sheet, row, col),
    run,
    stop,
    resume,
  };
};
