import { vi } from 'vite-plus/test';
import {
  createNuiConfig,
  createToastStore,
  provideNuiConfig,
  useToastStore,
  type Toast,
  type ToastHold,
  type ToastOptions,
  type ToastStore,
  type ToastStoreOptions,
} from '../../src';
import { captureSetup } from './capture';

export class ToastHarness {
  static create(options?: ToastStoreOptions): ToastHarness {
    return new ToastHarness(createToastStore(options));
  }

  static viaPlugin(options?: ToastStoreOptions): ToastHarness {
    return new ToastHarness(
      captureSetup(() => useToastStore(), { plugins: [createNuiConfig({ toasts: options })] })
        .value,
    );
  }

  static shared(): ToastHarness {
    return new ToastHarness(captureSetup(() => useToastStore()).value);
  }

  static scoped(options: ToastStoreOptions): ToastHarness {
    return new ToastHarness(
      captureSetup(() => useToastStore(), {
        layers: [() => provideNuiConfig({ toasts: options })],
      }).value,
    );
  }

  constructor(readonly store: ToastStore) {}

  get ids(): string[] {
    return this.store.toasts.value.map((toast) => toast.id);
  }

  get visibleIds(): string[] {
    return this.store.visible.value.map((toast) => toast.id);
  }

  get leavingIds(): string[] {
    return this.store.toasts.value.reduce<string[]>((found, toast) => {
      if (toast.leaving) {
        found.push(toast.id);
      }
      return found;
    }, []);
  }

  get queued(): number {
    return this.store.queued.value;
  }

  record(id: string): Toast {
    const toast = this.store.toasts.value.find((entry) => entry.id === id);
    if (!toast) {
      throw new Error(`No toast ${id}`);
    }
    return toast;
  }

  show(options: ToastOptions): string {
    return this.store.show(options);
  }

  dismiss(id: string): void {
    this.store.dismiss(id);
  }

  hold(reason: ToastHold): void {
    this.store.hold(reason);
  }

  release(reason: ToastHold): void {
    this.store.release(reason);
  }

  clear(): void {
    this.store.clear();
  }

  advance(ms: number): void {
    vi.advanceTimersByTime(ms);
  }
}
