import { vi } from 'vite-plus/test';
import {
  createNuiConfig,
  createToastStore,
  provideNuiConfig,
  useToastStore,
  type Toast,
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
    return this.store.toasts.value.filter((toast) => toast.leaving).map((toast) => toast.id);
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

  pause(id: string): void {
    this.store.pause(id);
  }

  resume(id: string): void {
    this.store.resume(id);
  }

  clear(): void {
    this.store.clear();
  }

  advance(ms: number): void {
    vi.advanceTimersByTime(ms);
  }
}
