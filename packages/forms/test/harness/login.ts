import { customAsync, type AsyncFieldRule } from '../../src';

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class LoginCheck {
  readonly calls: string[] = [];
  readonly signals: AbortSignal[] = [];
  down = false;

  readonly rule: AsyncFieldRule = customAsync(async (value, { signal }) => {
    const login = typeof value === 'string' ? value : '';

    this.calls.push(login);
    this.signals.push(signal);
    await sleep(this.latency);

    if (this.down) {
      throw new Error('network down');
    }
    return this.taken.includes(login) ? 'This login is taken' : undefined;
  });

  constructor(
    private readonly taken: readonly string[],
    private readonly latency = 100,
  ) {}
}
