import type { RankHost } from '../../src/engine';

export interface RecordedRankSession {
  readonly parts: string[];
  finished: boolean;
  cancelled: boolean;
}

export interface RecordingRankHost extends RankHost {
  readonly sessions: RecordedRankSession[];
}

export const shuffledOrder = (size: number, seed: number): Uint32Array => {
  const order = Uint32Array.from({ length: size }, (_, index) => index);
  let state = seed;

  for (let index = size - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;

    const other = state % (index + 1);
    const kept = order[index] ?? 0;

    order[index] = order[other] ?? 0;
    order[other] = kept;
  }
  return order;
};

export const recordingRankHost = (answer?: (size: number) => Uint32Array): RecordingRankHost => {
  const sessions: RecordedRankSession[] = [];

  return {
    sessions,
    open: () => {
      const session: RecordedRankSession = { parts: [], finished: false, cancelled: false };

      const pending: { settle: ((order: Uint32Array | undefined) => void) | undefined } = {
        settle: undefined,
      };

      sessions.push(session);

      return {
        send: (text) => {
          session.parts.push(text);
        },
        finish: (lengths) =>
          new Promise((resolve) => {
            session.finished = true;
            pending.settle = resolve;

            if (answer === undefined) {
              return;
            }

            resolve(answer(lengths.length));
          }),
        cancel: () => {
          session.cancelled = true;
          pending.settle?.(undefined);
        },
      };
    },
  };
};
