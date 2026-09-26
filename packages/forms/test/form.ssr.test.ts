// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { useField, useForm } from '../src';

const noop = (): void => undefined;

const input = (path: string) =>
  defineComponent({
    setup: () => {
      const field = useField<string>(path);
      return () => h('input', { name: field.path.value, value: field.value.value });
    },
  });

const Profile = defineComponent({
  setup: () => {
    useForm({
      initialValues: { email: 'ann@example.com', address: { city: 'Paris' } },
      onSubmit: noop,
    });

    return () => h('form', [h(input('email')), h(input('address.city'))]);
  },
});

describe('forms on the server', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders field values the same way twice and schedules no timers', async () => {
    vi.useFakeTimers();

    const first = await renderToString(createSSRApp(Profile));
    const second = await renderToString(createSSRApp(Profile));

    expect(first).toBe(second);

    expect(first).toBe(
      '<form><input name="email" value="ann@example.com"><input name="address.city" value="Paris"></form>',
    );

    expect(vi.getTimerCount()).toBe(0);
  });
});
