import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import { useWebOtp, type WebOtpControl } from '../../src';
import { captureSetup } from './capture';

export class WebOtpHarness {
  static mount(): WebOtpHarness {
    const codes: string[] = [];
    const enabled = ref(true);

    const capture = captureSetup(() => useWebOtp({ enabled, onCode: (code) => codes.push(code) }));

    return new WebOtpHarness(capture.value, capture.wrapper, enabled, codes);
  }

  private constructor(
    private readonly control: WebOtpControl,
    private readonly wrapper: VueWrapper,
    private readonly enabled: Ref<boolean>,
    readonly codes: readonly string[],
  ) {}

  get supported(): boolean {
    return this.control.supported.value;
  }

  async settle(): Promise<void> {
    await flushPromises();
  }

  async enable(value: boolean): Promise<void> {
    this.enabled.value = value;
    await flushPromises();
  }

  async abort(): Promise<void> {
    this.control.abort();
    await flushPromises();
  }

  async unmount(): Promise<void> {
    this.wrapper.unmount();
    await flushPromises();
  }
}
