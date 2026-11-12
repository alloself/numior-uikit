import { vi } from 'vite-plus/test';

export const atInstant = async <T>(
  instant: string,
  zone: string,
  run: () => T | Promise<T>,
): Promise<T> => {
  const previous = process.env.TZ;

  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(instant));
  process.env.TZ = zone;

  try {
    return await run();
  } finally {
    vi.useRealTimers();

    if (previous === undefined) {
      Reflect.deleteProperty(process.env, 'TZ');
    } else {
      process.env.TZ = previous;
    }
  }
};
