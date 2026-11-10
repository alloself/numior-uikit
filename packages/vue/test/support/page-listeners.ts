import { vi, type MockInstance } from 'vite-plus/test';

type ListenerSpy = MockInstance<Document['addEventListener']>;

const callsOf = (spy: ListenerSpy, event: string): number =>
  spy.mock.calls.reduce((count, [type]) => count + Number(type === event), 0);

export class PageListeners {
  private readonly added: ListenerSpy = vi.spyOn(document, 'addEventListener');

  private readonly removed: ListenerSpy = vi.spyOn(document, 'removeEventListener');

  held(event: string): number {
    return callsOf(this.added, event) - callsOf(this.removed, event);
  }

  restore(): void {
    this.added.mockRestore();
    this.removed.mockRestore();
  }
}
