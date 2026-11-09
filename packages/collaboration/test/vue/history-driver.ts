import type { HistoryAdapter } from '../../src';
import type { CollabAlternatives, NuiEditorHistoryProps } from '../../src/vue';
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { documentOf } from './comments-adapter';
import HistoryHost from './HistoryHost.vue';

export const ANN = { id: 'ann', name: 'Ann' };

export class HistoryDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount(
    adapter: HistoryAdapter,
    labels?: NuiEditorHistoryProps['labels'],
    texts: readonly string[] = ['current'],
    alternatives?: CollabAlternatives,
  ): HistoryDriver {
    return new HistoryDriver(
      mount(HistoryHost, {
        attachTo: document.body,
        props: { initial: documentOf(...texts), adapter, user: ANN, alternatives, labels },
      }),
    );
  }

  async loaded(): Promise<void> {
    await flushPromises();
  }

  private button(name: string): DOMWrapper<HTMLButtonElement> {
    const found = this.wrapper.findAll('button').find((button) => button.text() === name);

    if (found === undefined) {
      throw new Error(`No button named ${name}`);
    }
    return found;
  }

  get overwritten(): readonly string[] {
    return this.wrapper
      .findAll('.nui-collab-history__alternative')
      .map(
        (row) =>
          `${row.find('.nui-collab-history__value').text()} | ${row.find('.nui-collab-history__source').text()}`,
      );
  }

  async pressLabelled(name: string): Promise<void> {
    await this.wrapper.find(`.nui-collab-history button[aria-label="${name}"]`).trigger('click');
    await flushPromises();
  }

  get versions(): readonly string[] {
    return this.wrapper.findAll('[role="option"]').map((option) => option.text());
  }

  get title(): string {
    return this.wrapper.find('.nui-collab-history__title').text();
  }

  get additions(): readonly string[] {
    return this.wrapper.findAll('.nui-collab-history ins').map((mark) => mark.text());
  }

  get removals(): readonly string[] {
    return this.wrapper.findAll('.nui-collab-history del').map((mark) => mark.text());
  }

  get previewText(): string {
    return this.wrapper.find('.nui-collab-history .nui-content').text();
  }

  get editorText(): string {
    return this.wrapper.find('[contenteditable]').text();
  }

  get previewShown(): boolean {
    return this.wrapper.find('.nui-collab-history .nui-content').exists();
  }

  get loadingShown(): boolean {
    return this.wrapper.find('.nui-collab-history .nui-skeleton').exists();
  }

  get noChangesShown(): boolean {
    return this.wrapper.find('.nui-collab-history__note').exists();
  }

  get failed(): boolean {
    return this.wrapper.find('.nui-alert').exists();
  }

  get emptyShown(): boolean {
    return this.wrapper.find('.nui-empty').exists();
  }

  get canSave(): boolean {
    return this.wrapper.findAll('button').some((button) => button.text() === 'Save version');
  }

  async pick(index: number): Promise<void> {
    await this.wrapper.findAll('[role="option"]')[index]?.trigger('click');
    await flushPromises();
  }

  async pickWithoutWaiting(index: number): Promise<void> {
    await this.wrapper.findAll('[role="option"]')[index]?.trigger('click');
  }

  async press(name: string): Promise<void> {
    await this.button(name).trigger('click');
    await flushPromises();
  }

  async toggleChanges(): Promise<void> {
    await this.wrapper.find('.nui-collab-history [role="switch"]').trigger('click');
    await flushPromises();
  }
}
