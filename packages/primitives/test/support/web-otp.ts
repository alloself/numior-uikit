import { vi } from 'vitest';

interface PendingRequest {
  readonly signal: AbortSignal | undefined;
  readonly resolve: (credential: Credential | null) => void;
}

export interface WebOtpStub {
  readonly requests: number;
  readonly aborted: number;
  deliver(code: string | null): void;
  restore(): void;
}

class FakeOtpCredential {
  readonly type = 'otp';
}

export const installWebOtp = (): WebOtpStub => {
  const pending: PendingRequest[] = [];
  const counters = { requests: 0, aborted: 0 };

  const get = (options?: CredentialRequestOptions): Promise<Credential | null> =>
    new Promise((resolve, reject) => {
      const signal = options?.signal ?? undefined;
      counters.requests += 1;
      pending.push({ signal, resolve });

      signal?.addEventListener('abort', () => {
        counters.aborted += 1;
        reject(new DOMException('The request was aborted', 'AbortError'));
      });
    });

  vi.stubGlobal('OTPCredential', FakeOtpCredential);

  Object.defineProperty(window.navigator, 'credentials', {
    configurable: true,
    value: { get },
  });

  return {
    get requests() {
      return counters.requests;
    },
    get aborted() {
      return counters.aborted;
    },
    deliver: (code) => {
      const request = pending.findLast((entry) => entry.signal?.aborted !== true);
      const credential = { id: '', type: 'otp', code };

      request?.resolve(code === null ? null : credential);
    },
    restore: () => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(window.navigator, 'credentials');
    },
  };
};
