import { useMounted } from '@vueuse/core';
import { computed, onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

export interface WebOtpOptions {
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly onCode: (code: string) => void;
}

export interface WebOtpControl {
  readonly supported: Readonly<Ref<boolean>>;
  abort(): void;
}

interface OtpRequestOptions extends CredentialRequestOptions {
  readonly otp: { readonly transport: readonly string[] };
}

const hasWebOtp = (): boolean =>
  typeof window !== 'undefined' &&
  'OTPCredential' in window &&
  typeof window.navigator.credentials?.get === 'function';

const codeOf = (credential: Credential | null): string | undefined =>
  credential !== null && 'code' in credential && typeof credential.code === 'string'
    ? credential.code
    : undefined;

const receive = async (signal: AbortSignal): Promise<string | undefined> => {
  const request: OtpRequestOptions = { otp: { transport: ['sms'] }, signal };

  try {
    return codeOf(await window.navigator.credentials.get(request));
  } catch {
    return undefined;
  }
};

export const useWebOtp = (options: WebOtpOptions): WebOtpControl => {
  const mounted = useMounted();
  const supported = computed(() => mounted.value && hasWebOtp());
  const state: { controller: AbortController | null } = { controller: null };

  const abort = (): void => {
    state.controller?.abort();
    state.controller = null;
  };

  const listen = async (): Promise<void> => {
    const controller = new AbortController();
    state.controller = controller;
    const code = await receive(controller.signal);

    if (state.controller === controller) {
      state.controller = null;
    }
    if (code !== undefined && !controller.signal.aborted) {
      options.onCode(code);
    }
  };

  watch(
    () => supported.value && toValue(options.enabled) !== false,
    (active) => {
      if (!active) {
        abort();
      } else if (state.controller === null) {
        void listen();
      }
    },
    { immediate: true },
  );

  onScopeDispose(abort);

  return { supported, abort };
};
