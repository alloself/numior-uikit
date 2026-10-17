import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { isShown } from '../support/popovers';
import type { EditorDriver } from './editor';

export class EditorLinksDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorLinksDriver {
    return new EditorLinksDriver(editor.vueWrapper);
  }

  private get document(): Document {
    return this.wrapper.element.ownerDocument;
  }

  private get content(): HTMLElement {
    const element = this.document.querySelector('.nui-editor__content:not(.nui-editor__static)');

    if (!(element instanceof HTMLElement)) {
      throw new Error('The editor has no content root');
    }
    return element;
  }

  async settle(): Promise<void> {
    await flushPromises();
    await nextTick();
  }

  get pasteOptions(): readonly string[] {
    const menu = this.document.querySelector('.nui-editor-paste');

    return isShown(menu)
      ? [...(menu?.querySelectorAll('[role^="menuitem"]') ?? [])].map(
          (item) => item.textContent?.trim() ?? '',
        )
      : [];
  }

  async choosePaste(label: string): Promise<void> {
    const item = [...this.document.querySelectorAll('.nui-editor-paste [role^="menuitem"]')].find(
      (candidate) => candidate.textContent?.trim() === label,
    );

    if (!(item instanceof HTMLElement)) {
      throw new Error(`No paste option reads ${label}`);
    }
    item.click();
    await this.settle();
  }

  get frames(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor-embed')].map((embed) => {
      const frame = embed.querySelector('iframe');

      return frame === null
        ? `none:${embed.querySelector('.nui-content__embed-link')?.textContent?.trim() ?? ''}`
        : `frame:${frame.getAttribute('src') ?? ''}`;
    });
  }

  get bookmarks(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-content__bookmark-link')].map((card) =>
      [
        card.querySelector('.nui-content__bookmark-title')?.textContent?.trim() ?? '',
        card.querySelector('.nui-content__bookmark-description')?.textContent?.trim() ?? '',
        card.querySelector('.nui-content__bookmark-site')?.textContent?.trim() ?? '',
      ].join('|'),
    );
  }

  async select(selector: string): Promise<void> {
    this.content
      .querySelector(selector)
      ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));

    await nextTick();
  }

  get barActions(): readonly string[] {
    return [
      ...this.content.querySelectorAll('.nui-editor-link-bar button, .nui-editor-link-bar a'),
    ].map((action) => action.getAttribute('aria-label') ?? '');
  }

  async act(label: string): Promise<void> {
    const action = [...this.content.querySelectorAll('.nui-editor-link-bar button')].find(
      (candidate) => candidate.getAttribute('aria-label') === label,
    );

    if (!(action instanceof HTMLElement)) {
      throw new Error(`No link action reads ${label}`);
    }
    action.click();
    await this.settle();
  }
}
