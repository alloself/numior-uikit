import { hostname, cpus, platform, release, totalmem } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export interface Operation {
  readonly name: string;
  readonly samples: number;
  readonly meanMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
}

export interface MeasureOptions {
  readonly iterations: number;
  readonly warmup?: number;
}

export interface RecordVariant {
  readonly suffix?: string | undefined;
  readonly browser?: string | undefined;
  readonly heapUsedMb?: number | undefined;
}

interface BenchRecord {
  readonly recordedAt: string;
  readonly dataset: string;
  readonly device: {
    readonly host: string;
    readonly cpu: string;
    readonly cores: number;
    readonly memoryGb: number;
    readonly platform: string;
    readonly node: string;
  };
  readonly browser: string | null;
  readonly heapUsedMb: number;
  readonly operations: readonly Operation[];
}

const quantile = (sorted: readonly number[], share: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1);
  return sorted[Math.max(0, position)] ?? 0;
};

const benchHost = (): string => process.env.BENCH_HOST ?? hostname();

export const summarize = (name: string, samples: readonly number[]): Operation => {
  const sorted = samples.toSorted((a, b) => a - b);
  const meanMs = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);

  const operation = {
    name,
    samples: samples.length,
    meanMs,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? 0,
  };

  console.log(
    `${name}: p50 ${operation.p50Ms.toFixed(1)} ms, p95 ${operation.p95Ms.toFixed(1)} ms, max ${operation.maxMs.toFixed(1)} ms (${samples.length} samples)`,
  );

  return operation;
};

const collectGarbage = (): void => {
  const gc: unknown = Reflect.get(globalThis, 'gc');

  if (typeof gc === 'function') {
    gc();
  }
};

export const measure = async (
  name: string,
  run: () => Promise<void>,
  options: MeasureOptions,
): Promise<Operation> => {
  for (let index = 0; index < (options.warmup ?? 1); index += 1) {
    await run();
  }
  const samples: number[] = [];

  for (let index = 0; index < options.iterations; index += 1) {
    collectGarbage();

    const started = performance.now();
    await run();
    samples.push(performance.now() - started);
  }
  return summarize(name, samples);
};

export const record = async (
  resultsDir: URL,
  dataset: string,
  operations: readonly Operation[],
  variant: RecordVariant = {},
): Promise<string> => {
  const recordedAt = new Date().toISOString();
  const host = benchHost();

  const entry: BenchRecord = {
    recordedAt,
    dataset,
    device: {
      host,
      cpu: cpus()[0]?.model ?? 'unknown',
      cores: cpus().length,
      memoryGb: Math.round(totalmem() / 1_073_741_824),
      platform: `${platform()} ${release()}`,
      node: process.version,
    },
    browser: variant.browser ?? null,
    heapUsedMb: variant.heapUsedMb ?? Math.round(process.memoryUsage().heapUsed / 1_048_576),
    operations,
  };

  await mkdir(resultsDir, { recursive: true });
  const suffix = variant.suffix === undefined ? '' : `-${variant.suffix}`;
  const file = new URL(`${recordedAt.slice(0, 10)}-${host}${suffix}.json`, resultsDir);
  await writeFile(file, `${JSON.stringify(entry, null, 2)}\n`);
  return fileURLToPath(file);
};
