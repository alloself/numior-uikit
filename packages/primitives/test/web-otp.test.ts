import { afterEach, describe, expect, it } from 'vite-plus/test';
import { WebOtpHarness } from './harness/web-otp';
import { installWebOtp, type WebOtpStub } from './support/web-otp';

describe('useWebOtp', () => {
  let stub: WebOtpStub | undefined;

  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('reports no support and asks nothing without the WebOTP API', async () => {
    const otp = WebOtpHarness.mount();
    await otp.settle();
    expect(otp.supported).toBe(false);
    expect(otp.codes).toEqual([]);
  });

  it('asks for a code once mounted and hands over the received one', async () => {
    stub = installWebOtp();
    const otp = WebOtpHarness.mount();
    await otp.settle();
    expect(otp.supported).toBe(true);
    expect(stub.requests).toBe(1);
    stub.deliver('482913');
    await otp.settle();
    expect(otp.codes).toEqual(['482913']);
    expect(stub.requests).toBe(1);
  });

  it('ignores a credential without a code', async () => {
    stub = installWebOtp();
    const otp = WebOtpHarness.mount();
    await otp.settle();
    stub.deliver(null);
    await otp.settle();
    expect(otp.codes).toEqual([]);
  });

  it('aborts while disabled and asks again once enabled', async () => {
    stub = installWebOtp();
    const otp = WebOtpHarness.mount();
    await otp.settle();
    await otp.enable(false);
    expect(stub.aborted).toBe(1);
    stub.deliver('482913');
    await otp.settle();
    expect(otp.codes).toEqual([]);
    await otp.enable(true);
    expect(stub.requests).toBe(2);
    stub.deliver('482913');
    await otp.settle();
    expect(otp.codes).toEqual(['482913']);
  });

  it('aborts on demand and on unmount', async () => {
    stub = installWebOtp();
    const otp = WebOtpHarness.mount();
    await otp.settle();
    await otp.abort();
    expect(stub.aborted).toBe(1);
    stub.deliver('482913');
    await otp.settle();
    expect(otp.codes).toEqual([]);
    await otp.enable(false);
    await otp.enable(true);
    expect(stub.requests).toBe(2);
    await otp.unmount();
    expect(stub.aborted).toBe(2);
  });
});
