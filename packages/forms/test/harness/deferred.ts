export class Deferred<T = void> {
  readonly promise: Promise<T>;
  private settle: (value: T) => void = () => undefined;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.settle = resolve;
    });
  }

  resolve(value: T): void {
    this.settle(value);
  }
}
