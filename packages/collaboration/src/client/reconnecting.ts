import type { ClientMessage } from '../protocol/protocol.types';
import type {
  CollabRetry,
  CollabTransport,
  TransportConnection,
  TransportListener,
} from './client.types';

interface Reconnecting {
  readonly start: () => void;
  readonly send: (message: ClientMessage) => void;
  readonly settle: () => void;
  readonly restart: () => void;
  readonly stop: () => void;
}

interface Held {
  own?: TransportConnection;
}

const BASE_DELAY = 200;

const MAX_DELAY = 10_000;

const backoffDelay = (retry: CollabRetry | undefined, attempts: number): number => {
  const ceiling = Math.min(retry?.max ?? MAX_DELAY, (retry?.base ?? BASE_DELAY) * 2 ** attempts);

  return ceiling / 2 + Math.random() * (ceiling / 2);
};

export const createReconnecting = (
  transport: CollabTransport,
  retry: CollabRetry | undefined,
  listener: TransportListener,
): Reconnecting => {
  let connection: TransportConnection | undefined;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const open = (): void => {
    const held: Held = {};
    const early: (() => void)[] = [];

    const own =
      <Args extends readonly unknown[]>(act: (...args: Args) => void) =>
      (...args: Args): void => {
        if (held.own === undefined) {
          early.push(() => {
            act(...args);
          });
        } else if (connection === held.own) {
          act(...args);
        }
      };

    held.own = transport.open({
      opened: own(listener.opened),
      message: own(listener.message),
      closed: own(lost),
    });

    connection = held.own;

    for (const act of early) {
      if (connection === held.own) {
        act();
      }
    }
  };

  const lost = (): void => {
    connection = undefined;
    listener.closed();

    if (stopped) {
      return;
    }

    timer = setTimeout(open, backoffDelay(retry, attempts));
    attempts += 1;
  };

  return {
    start: open,
    send: (message) => {
      connection?.send(message);
    },
    settle: () => {
      attempts = 0;
    },
    restart: () => {
      const stale = connection;

      if (stale === undefined) {
        return;
      }

      lost();
      stale.close();
    },
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      connection?.close();
    },
  };
};
