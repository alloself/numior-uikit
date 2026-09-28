import { customAsync, type AsyncFieldRule } from '../../src';
import { Deferred } from './deferred';

export class CodeCheck {
  readonly calls: string[] = [];
  private readonly gate = new Deferred();
  private readonly entry = new Deferred();

  readonly rule: AsyncFieldRule = customAsync(async (value) => {
    const code = typeof value === 'string' ? value : '';

    this.calls.push(code);
    this.entry.resolve();
    await this.gate.promise;
    return code === 'good' ? undefined : 'Unknown code';
  });

  entered(): Promise<void> {
    return this.entry.promise;
  }

  open(): void {
    this.gate.resolve();
  }
}
