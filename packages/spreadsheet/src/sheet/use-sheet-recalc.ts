import { useRafFn, useTimeoutFn } from '@vueuse/core';
import { ref } from 'vue';
import type { RecalcOptions, Recalculation } from '../core';
import {
  RecalcPhase,
  type CellOutdated,
  type SheetRecalc,
  type SheetRecalcOptions,
} from './sheet.types';

const SHOW_AFTER_MS = 300;

const NOTHING_OUTDATED: CellOutdated = () => false;

const shareOf = (run: Recalculation): number => (run.total === 0 ? 0 : run.done / run.total);

export const useSheetRecalc = (options: SheetRecalcOptions): SheetRecalc => {
  const phase = ref<RecalcPhase>(RecalcPhase.Idle);

  const progress = ref(0);

  const revision = ref(0);

  let current: Recalculation | undefined;

  let stopped = false;

  let outdated = NOTHING_OUTDATED;

  const redraw = (): void => {
    revision.value += 1;
    options.table.value?.invalidate();
  };

  const tracking = useRafFn(
    () => {
      if (current !== undefined) {
        progress.value = shareOf(current);
      }
    },
    { immediate: false },
  );

  const reveal = useTimeoutFn(
    () => {
      if (current === undefined || current.finished) {
        return;
      }
      outdated = options.calculator().outdated();
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

    outdated = stopped ? options.calculator().outdated() : NOTHING_OUTDATED;
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
      outdated = NOTHING_OUTDATED;
      phase.value = RecalcPhase.Idle;
      return;
    }
    current = started;

    if (phase.value === RecalcPhase.Idle) {
      reveal.start();
    } else {
      outdated = options.calculator().outdated();
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
    outdated: (sheet, row, col) => outdated(sheet, row, col),
    run,
    stop,
    resume,
  };
};
