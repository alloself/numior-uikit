import type { RankHost } from '../../src/engine';

export interface RecordedRankSession {
  readonly parts: string[];
  finished: boolean;
  cancelled: boolean;
}

export interface RecordingRankHost extends RankHost {
  readonly sessions: RecordedRankSession[];
}

export const recordingRankHost = (): RecordingRankHost => {
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
        finish: () =>
          new Promise((resolve) => {
            session.finished = true;
            pending.settle = resolve;
          }),
        cancel: () => {
          session.cancelled = true;
          pending.settle?.(undefined);
        },
      };
    },
  };
};
