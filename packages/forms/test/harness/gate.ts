import { Deferred } from './deferred';

export class SubmitGate {
  readonly calls: unknown[] = [];
  private readonly gate = new Deferred();
  private readonly entry = new Deferred();

  readonly handler = (values: unknown): Promise<void> => {
    this.calls.push(values);
    this.entry.resolve();
    return this.gate.promise;
  };

  entered(): Promise<void> {
    return this.entry.promise;
  }

  open(): void {
    this.gate.resolve();
  }
}
