import type { Locator, Page } from '@playwright/test';
import {
  isNumber,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isEditorOutput = shapeOf({ blocks: isNumber, changes: isNumber });

export type EditorOutput = Guarded<typeof isEditorOutput>;

export interface Copied {
  readonly text: string;
  readonly html: string;
}

export class EditorSection {
  readonly root: Locator;
  readonly content: Locator;
  readonly frame: Locator;
  readonly preview: Locator;
  readonly readonlySwitch: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('section[aria-labelledby="editor-title"]');
    this.content = page.getByTestId('editor');
    this.frame = this.root.locator('.nui-editor');
    this.preview = page.getByTestId('editor-preview');
    this.readonlySwitch = page.getByTestId('editor-readonly');
    this.output = page.getByTestId('editor-output');
  }

  async readOutput(): Promise<EditorOutput> {
    return parseAs((await this.output.textContent()) ?? '', isEditorOutput, 'editor output');
  }

  blockTags(): Promise<string[]> {
    return this.content.evaluate((root) =>
      [...root.querySelectorAll(':scope > .nui-editor__chunk > *')].map((block) =>
        block.tagName.toLowerCase(),
      ),
    );
  }

  blockTexts(): Promise<string[]> {
    return this.content.evaluate((root) =>
      [...root.querySelectorAll(':scope > .nui-editor__chunk > *')].map(
        (block) => block.textContent ?? '',
      ),
    );
  }

  previewTexts(): Promise<string[]> {
    return this.preview.evaluate((root) =>
      [...root.children].map((child) => child.textContent ?? ''),
    );
  }

  async clear(): Promise<void> {
    await this.content.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
  }

  async placeAtEnd(): Promise<void> {
    await this.content.evaluate((root) => {
      const last = root.lastElementChild ?? root;
      const range = document.createRange();

      range.selectNodeContents(last);
      range.collapse(false);
      root.focus();
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });
  }

  async placeInText(text: string, offset: number): Promise<void> {
    await this.content.evaluate(
      (root, target) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if (node.textContent?.includes(target.text) === true) {
            const at = (node.textContent.indexOf(target.text) ?? 0) + target.offset;

            root.focus();
            document.getSelection()?.setBaseAndExtent(node, at, node, at);
            return;
          }
        }
        throw new Error(`No text reads ${target.text}`);
      },
      { text, offset },
    );
  }

  selectedAtoms(): Locator {
    return this.content.locator('.nui-editor__selected');
  }

  mention(): Locator {
    return this.content.locator('.nui-content__mention');
  }

  async paste(text: string, html = ''): Promise<void> {
    await this.content.evaluate(
      (root, value) => {
        const data = new DataTransfer();

        data.setData('text/plain', value.text);
        if (value.html !== '') {
          data.setData('text/html', value.html);
        }

        const event = new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        });

        if (event.clipboardData?.getData('text/plain') !== value.text) {
          Object.defineProperty(event, 'clipboardData', { value: data });
        }
        root.dispatchEvent(event);
      },
      { text, html },
    );
  }

  async copy(): Promise<Copied> {
    return this.content.evaluate((root) => {
      const data = new DataTransfer();

      const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true });

      Object.defineProperty(event, 'clipboardData', { value: data });
      root.dispatchEvent(event);
      return { text: data.getData('text/plain'), html: data.getData('text/html') };
    });
  }

  async composeThroughCdp(text: string): Promise<void> {
    const session = await this.page.context().newCDPSession(this.page);

    for (let length = 1; length <= text.length; length += 1) {
      const part = text.slice(0, length);

      await session.send('Input.imeSetComposition', {
        text: part,
        selectionStart: part.length,
        selectionEnd: part.length,
      });
    }
    await session.send('Input.insertText', { text });
    await session.detach();
  }

  async composeSynthetically(text: string): Promise<void> {
    await this.content.evaluate((root, value) => {
      const selection = document.getSelection();
      const anchor = selection?.anchorNode;
      const offset = selection?.anchorOffset ?? 0;

      root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));

      root.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertCompositionText',
          data: value,
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      );

      if (anchor instanceof Text) {
        anchor.insertData(offset, value);
        selection?.collapse(anchor, offset + value.length);
      } else if (anchor instanceof Element) {
        const node = document.createTextNode(value);

        anchor.insertBefore(node, anchor.childNodes[offset] ?? null);
        selection?.collapse(node, value.length);
      }
      root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
    }, text);
  }

  async editWithoutEvents(find: string, replace: string): Promise<void> {
    await this.content.evaluate(
      (root, change) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if (node instanceof Text && node.data.includes(change.find)) {
            node.replaceData(node.data.indexOf(change.find), change.find.length, change.replace);
            return;
          }
        }
      },
      { find, replace },
    );
  }
}
