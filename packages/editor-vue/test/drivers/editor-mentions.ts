import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import { isShown } from '../support/popovers';
import type { EditorDriver } from './editor';

export class EditorMentionsDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorMentionsDriver {
    return new EditorMentionsDriver(editor.vueWrapper);
  }

  private get list(): Element | null {
    return this.wrapper.element.ownerDocument.querySelector('.nui-editor-mentions');
  }

  get shown(): boolean {
    return isShown(this.list);
  }

  get options(): readonly string[] {
    return [...(this.list?.querySelectorAll('[role="option"]') ?? [])].map((option) =>
      [
        option.querySelector('.nui-avatar img') === null
          ? (option.querySelector('.nui-avatar__initials')?.textContent?.trim() ?? '')
          : 'picture',
        option.querySelector('.nui-row__title')?.textContent?.trim() ?? '',
        option.querySelector('.nui-row__description')?.textContent?.trim() ?? '',
      ].join('|'),
    );
  }

  get active(): string {
    const id = this.wrapper.element.ownerDocument
      .querySelector('.nui-editor__content:not(.nui-editor__static)')
      ?.getAttribute('aria-activedescendant');

    return (
      this.list?.querySelector(`[id="${id ?? ''}"] .nui-row__title`)?.textContent?.trim() ?? ''
    );
  }

  get status(): string {
    return (
      this.list?.querySelector('.nui-list__status, .nui-list__empty')?.textContent?.trim() ?? ''
    );
  }

  async erase(): Promise<void> {
    this.wrapper.element.ownerDocument
      .querySelector('.nui-editor__content:not(.nui-editor__static)')
      ?.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'deleteContentBackward',
          bubbles: true,
          cancelable: true,
        }),
      );

    await nextTick();
  }

  async pause(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
    await flushPromises();
  }

  async choose(label: string): Promise<void> {
    const option = [...(this.list?.querySelectorAll('[role="option"]') ?? [])].find(
      (candidate) => candidate.querySelector('.nui-row__title')?.textContent?.trim() === label,
    );

    if (!(option instanceof HTMLElement)) {
      throw new Error(`No person reads ${label}`);
    }
    option.click();
    await nextTick();
  }
}
