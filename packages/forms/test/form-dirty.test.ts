import { describe, expect, it } from 'vite-plus/test';
import { FormHarness } from './harness/form';

describe('dirty state', () => {
  it('compares a field, its container and the whole form with the baseline', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', address: { city: 'Paris' } },
      fields: ['name', 'address.city'],
    });

    await form.type('address.city', 'Lyon');
    expect(form.dirty('address.city')).toBe(true);
    expect(form.dirty('address')).toBe(true);
    expect(form.dirty('name')).toBe(false);
    expect(form.meta.dirty).toBe(true);

    await form.type('address.city', 'Paris');
    expect(form.meta.dirty).toBe(false);
  });

  it('treats a key holding undefined like a missing key', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann' },
      fields: ['name', 'nickname'],
    });

    expect(form.meta.dirty).toBe(false);

    await form.change('nickname', 'annie');
    expect(form.dirty('nickname')).toBe(true);

    await form.change('nickname', undefined);
    expect(form.meta.dirty).toBe(false);
  });

  it('compares dates by time rather than by identity', async () => {
    const form = FormHarness.mount({
      initialValues: { due: new Date(Date.UTC(2026, 8, 26)) },
      fields: ['due'],
    });

    await form.change('due', new Date(Date.UTC(2026, 8, 26)));
    expect(form.dirty('due')).toBe(false);

    await form.change('due', new Date(Date.UTC(2026, 8, 27)));
    expect(form.dirty('due')).toBe(true);
  });
});
