import { applyUpdate, encodeStateAsUpdate, encodeStateVector, type Doc } from 'yjs';

export type RelaySide = 'left' | 'right';

export interface YjsRelay {
  readonly link: (side: RelaySide, online: boolean) => void;
  readonly destroy: () => void;
}

const RELAY = Symbol('relay');

const deliver = (from: Doc, to: Doc): void => {
  applyUpdate(to, encodeStateAsUpdate(from, encodeStateVector(to)), RELAY);
};

export const createYjsRelay = (left: Doc, right: Doc): YjsRelay => {
  const online: Record<RelaySide, boolean> = { left: true, right: true };

  const linked = (): boolean => online.left && online.right;

  const forwardTo =
    (to: Doc) =>
    (update: Uint8Array, origin: unknown): void => {
      if (origin === RELAY || !linked()) {
        return;
      }
      applyUpdate(to, update, RELAY);
    };

  const toRight = forwardTo(right);
  const toLeft = forwardTo(left);

  left.on('update', toRight);
  right.on('update', toLeft);
  deliver(left, right);
  deliver(right, left);

  return {
    link: (side, value) => {
      online[side] = value;

      if (!linked()) {
        return;
      }
      deliver(left, right);
      deliver(right, left);
    },
    destroy: () => {
      left.off('update', toRight);
      right.off('update', toLeft);
    },
  };
};
