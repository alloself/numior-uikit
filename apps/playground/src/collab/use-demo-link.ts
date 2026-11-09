import type {
  CollabTransport,
  TransportConnection,
  TransportListener,
} from '@numior/collaboration';
import { ref, watch, type Ref } from 'vue';

interface DemoLink {
  readonly online: Ref<boolean>;
  readonly transport: CollabTransport;
}

export const useDemoLink = (base: CollabTransport): DemoLink => {
  const online = ref(true);

  let live: TransportConnection | undefined;
  let waiting: TransportListener | undefined;

  const connect = (listener: TransportListener): void => {
    live = base.open(listener);
  };

  watch(
    online,
    (next) => {
      if (!next) {
        live?.close();
        live = undefined;
      } else if (waiting !== undefined) {
        const listener = waiting;

        waiting = undefined;
        connect(listener);
      }
    },
    { flush: 'sync' },
  );

  return {
    online,
    transport: {
      open: (listener) => {
        if (online.value) {
          connect(listener);
        } else {
          waiting = listener;
        }

        return {
          send: (message) => {
            live?.send(message);
          },
          close: () => {
            live?.close();
            waiting = undefined;
          },
        };
      },
    },
  };
};
