import type { PeerPresence } from '../protocol/protocol.types';

interface PresenceChannelOptions {
  readonly send: (state: unknown) => void;
  readonly ready: () => boolean;
  readonly onPeers: ((peers: ReadonlyMap<string, unknown>) => void) | undefined;
}

interface PresenceChannel {
  readonly set: (state: unknown) => void;
  readonly offer: () => void;
  readonly welcome: (peers: readonly PeerPresence[]) => void;
  readonly peer: (clientId: string, state: unknown) => void;
  readonly offline: () => void;
  readonly stop: () => void;
}

const SEND_INTERVAL = 60;

export const createPresenceChannel = ({
  send,
  ready,
  onPeers,
}: PresenceChannelOptions): PresenceChannel => {
  let peers = new Map<string, unknown>();
  let latest: unknown;
  let sent: unknown;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const publish = (next: Map<string, unknown>): void => {
    peers = next;
    onPeers?.(next);
  };

  const offer = (): void => {
    if (timer !== undefined || latest === sent || !ready()) {
      return;
    }
    sent = latest;
    send(latest);

    timer = setTimeout(() => {
      timer = undefined;
      offer();
    }, SEND_INTERVAL);
  };

  return {
    set: (state) => {
      latest = state;
      offer();
    },
    offer,
    welcome: (present) => {
      publish(new Map(present.map((item) => [item.clientId, item.state])));
      sent = undefined;
    },
    peer: (clientId, state) => {
      const next = new Map(peers);

      if (state === null) {
        next.delete(clientId);
      } else {
        next.set(clientId, state);
      }
      publish(next);
    },
    offline: () => {
      if (peers.size === 0) {
        return;
      }

      publish(new Map());
    },
    stop: () => {
      clearTimeout(timer);
      timer = undefined;
    },
  };
};
