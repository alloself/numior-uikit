import { customAsync, type AsyncFieldRule } from '../../src';

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const countryOf = (values: unknown): string =>
  typeof values === 'object' &&
  values !== null &&
  'country' in values &&
  typeof values.country === 'string'
    ? values.country
    : '';

export class DocumentCheck {
  readonly calls: string[] = [];

  readonly rule: AsyncFieldRule = customAsync(async (value, { values }) => {
    const document = typeof value === 'string' ? value : '';
    const country = countryOf(values);

    this.calls.push(`${country}:${document}`);
    await wait(this.latency);
    return this.known.get(country)?.includes(document) === true
      ? undefined
      : 'Unknown document for this country';
  });

  constructor(
    private readonly known: ReadonlyMap<string, readonly string[]>,
    private readonly latency = 100,
  ) {}
}
