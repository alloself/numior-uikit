import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { EditorDriver } from './editor';

const SCOPE = 'nui-content__token--scope-';

export class EditorCodeDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorCodeDriver {
    return new EditorCodeDriver(editor.vueWrapper);
  }

  private block(index: number): Element {
    const found = this.wrapper.element.ownerDocument.querySelectorAll(
      '.nui-editor__content:not(.nui-editor__static) .nui-content__code',
    )[index];

    if (found === undefined) {
      throw new Error(`No code block at ${String(index)}`);
    }
    return found;
  }

  tokens(index: number): string[] {
    return [...this.block(index).querySelectorAll(`[class^="${SCOPE}"]`)].map(
      (span) => `${span.className.slice(SCOPE.length)}:${span.textContent ?? ''}`,
    );
  }

  language(index: number): string {
    return (
      this.block(index).querySelector('.nui-editor-code__language, .nui-editor-code__label')
        ?.textContent ?? ''
    ).trim();
  }

  checkedLanguage(index: number): string {
    return (
      this.block(index).querySelector('.nui-editor-code__languages [aria-selected="true"]')
        ?.textContent ?? ''
    ).trim();
  }

  async settle(): Promise<void> {
    await flushPromises();
  }

  async pickLanguage(index: number, label: string): Promise<void> {
    const trigger = this.block(index).querySelector('.nui-editor-code__language');

    if (!(trigger instanceof HTMLElement)) {
      throw new Error('The code block has no language button');
    }
    trigger.click();
    await nextTick();

    const option = [
      ...this.wrapper.element.ownerDocument.querySelectorAll(
        '.nui-editor-code__languages [role="option"]',
      ),
    ].find((candidate) => candidate.textContent?.trim() === label);

    if (!(option instanceof HTMLElement)) {
      throw new Error(`No language reads ${label}`);
    }
    option.click();
    await flushPromises();
  }
}
