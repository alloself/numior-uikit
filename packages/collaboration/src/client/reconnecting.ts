import type { ClientMessage } from '../protocol/protocol.types';
import type {
  CollabRetry,
  CollabTransport,
  TransportConnection,
  TransportListener,
} from './client.types';

interface Reconnecting {
  readonly send: (message: ClientMessage) => void;
  readonly settle: () => void;
  readonly stop: () => void;
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
    connection = transport.open({
      opened: listener.opened,
      message: listener.message,
      closed: () => {
        connection = undefined;
        listener.closed();

        if (!stopped) {
          timer = setTimeout(open, backoffDelay(retry, attempts));
          attempts += 1;
        }
      },
    });
  };

  open();

  return {
    send: (message) => {
      connection?.send(message);
    },
    settle: () => {
      attempts = 0;
    },
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      connection?.close();
    },
  };
};
