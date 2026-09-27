import { afterEach, describe, expect, it } from 'vitest';
import { SkipLinkDriver } from './drivers/skip-link';

describe('NuiSkipLink', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('links to the target and moves focus onto it when activated', () => {
    const skip = SkipLinkDriver.mount();
    expect(skip.href).toBe('#main');
    expect(skip.text).toBe('Skip to content');
    expect(skip.activate()).toBe(true);
    expect(skip.targetFocused).toBe(true);
    expect(skip.targetTabindex).toBe('-1');
    skip.unmount();
  });

  it('falls back to native navigation without a target and speaks the configured language', () => {
    const missing = SkipLinkDriver.mount({ withTarget: false });
    expect(missing.activate()).toBe(false);
    missing.unmount();
    const russian = SkipLinkDriver.mount({ config: { locale: 'ru-RU' } });
    expect(russian.text).toBe('К содержимому');
    russian.unmount();
    const custom = SkipLinkDriver.mount({ props: { label: 'Jump' } });
    expect(custom.text).toBe('Jump');
    custom.unmount();
  });
});
