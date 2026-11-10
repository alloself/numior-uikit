import {
  OfflineCopy,
  type OfflineChannel,
  type OfflineChannelFactory,
  type OfflineLocks,
} from '../store/store.types';

export type Ownership =
  | { readonly state: typeof OfflineCopy.Kept; readonly release: () => void }
  | { readonly state: typeof OfflineCopy.Elsewhere | typeof OfflineCopy.Unavailable };

interface Claim {
  readonly kind: typeof Signal.Claim | typeof Signal.Held;
  readonly id: string;
}

const Signal = { Claim: 'claim', Held: 'held' } as const;

const CLAIM_WINDOW = 150;

const isClaim = (value: unknown): value is Claim =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  'id' in value &&
  (value.kind === Signal.Claim || value.kind === Signal.Held) &&
  typeof value.id === 'string';

const lockedBy = (locks: OfflineLocks, name: string): Promise<Ownership> =>
  new Promise((resolve) => {
    void locks.request(name, { ifAvailable: true }, (lock) => {
      if (lock === null) {
        resolve({ state: OfflineCopy.Elsewhere });
        return undefined;
      }
      return new Promise<void>((release) => {
        resolve({ state: OfflineCopy.Kept, release });
      });
    });
  });

const claimedBy = (channel: OfflineChannel): Promise<Ownership> =>
  new Promise((resolve) => {
    const id = crypto.randomUUID();
    let owner = false;
    let lost = false;

    const release = (): void => {
      channel.close();
    };

    const timer = setTimeout(() => {
      owner = true;
      resolve({ state: OfflineCopy.Kept, release });
    }, CLAIM_WINDOW);

    const yielded = (): void => {
      lost = true;
      clearTimeout(timer);
      release();
      resolve({ state: OfflineCopy.Elsewhere });
    };

    channel.addEventListener('message', (event) => {
      const signal = event.data;

      if (lost || !isClaim(signal)) {
        return;
      }

      if (owner) {
        channel.postMessage({ kind: Signal.Held, id });
        return;
      }

      if (signal.kind === Signal.Held || signal.id < id) {
        yielded();
        return;
      }

      channel.postMessage({ kind: Signal.Claim, id });
    });

    channel.postMessage({ kind: Signal.Claim, id });
  });

export const defaultLocks = (): OfflineLocks | undefined => globalThis.navigator?.locks;

export const defaultChannel = (): OfflineChannelFactory | undefined =>
  typeof globalThis.BroadcastChannel === 'function'
    ? (name) => new BroadcastChannel(name)
    : undefined;

export const ownershipOf = (
  name: string,
  locks: OfflineLocks | undefined,
  channel: OfflineChannelFactory | undefined,
): Promise<Ownership> => {
  if (locks !== undefined) {
    return lockedBy(locks, name);
  }

  return channel === undefined
    ? Promise.resolve({ state: OfflineCopy.Unavailable })
    : claimedBy(channel(name));
};
