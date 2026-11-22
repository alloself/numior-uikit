import { expect, type Locator, type Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import { ARROWS, type ArrowDirection } from '../helpers/keyboard';
import { motionOf, slowMotion } from '../helpers/motion';
import {
  isNumber,
  isString,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

export type EditorOutput = Guarded<typeof isEditorOutput>;

export interface Copied {
  readonly text: string;
  readonly html: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PastedFile {
  readonly name: string;
  readonly type: string;
}

const CELL_GRAB = { x: 20, y: 10 };

const isEditorOutput = shapeOf({ blocks: isNumber, changes: isNumber, paste: nullable(isString) });

export class EditorSection {
  readonly root: Locator;
  readonly content: Locator;
  readonly frame: Locator;
  readonly preview: Locator;
  readonly readonlySwitch: Locator;
  readonly uploadsSwitch: Locator;
  readonly uploadFailSwitch: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('section[aria-labelledby="editor-title"]');
    this.content = page.getByTestId('editor');
    this.frame = this.root.locator('.nui-editor');
    this.preview = page.getByTestId('editor-preview');
    this.readonlySwitch = page.getByTestId('editor-readonly');
    this.uploadsSwitch = page.getByTestId('editor-uploads');
    this.uploadFailSwitch = page.getByTestId('editor-upload-fail');
    this.output = page.getByTestId('editor-output');
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async deleteBackward(): Promise<void> {
    await this.page.keyboard.press('Backspace');
  }

  async deleteForward(): Promise<void> {
    await this.page.keyboard.press('Delete');
  }

  async moveCaret(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(ARROWS[direction]);
  }

  async extendSelection(direction: 'left' | 'right'): Promise<void> {
    await this.page.keyboard.press(`Shift+${ARROWS[direction]}`);
  }

  async caretToLineStart(): Promise<void> {
    await this.page.keyboard.press('Home');
  }

  async caretToLineEnd(): Promise<void> {
    await this.page.keyboard.press('End');
  }

  async clickLineStart(block: Locator): Promise<void> {
    const box = await boxOf(block);

    await this.page.mouse.click(box.x + 1, box.y + box.height / 2);
  }

  async selectToLineStart(): Promise<void> {
    await this.page.keyboard.press('Shift+Home');
  }

  async undo(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+z');
  }

  async selectAll(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+a');
  }

  async toggleBold(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+b');
  }

  async openLinkField(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+k');
  }

  async leaveCodeBlock(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+Enter');
  }

  async moveBlockUp(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+Shift+ArrowUp');
  }

  async indent(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async outdent(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  async focusToolbar(): Promise<void> {
    await this.page.keyboard.press('Alt+F10');
  }

  async tapShift(): Promise<void> {
    await this.page.keyboard.press('Shift');
  }

  async replaceSelectionWith(character: string): Promise<void> {
    await this.page.keyboard.press(character);
  }

  async startLineAtEnd(): Promise<void> {
    await this.placeAtEnd();
    await this.showCaret();
    await this.pressEnter();
  }

  async drawCellRange(from: Locator, to: Locator): Promise<void> {
    const [start, end] = await Promise.all([boxOf(from), boxOf(to)]);

    await this.page.mouse.move(start.x + CELL_GRAB.x, start.y + CELL_GRAB.y);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + CELL_GRAB.x, end.y + CELL_GRAB.y, { steps: 8 });
    await this.page.mouse.up();
  }

  async rightClickCell(cell: Locator): Promise<void> {
    const box = await boxOf(cell);

    await this.page.mouse.click(box.x + CELL_GRAB.x, box.y + CELL_GRAB.y, { button: 'right' });
  }

  hasFinePointer(): Promise<boolean> {
    return this.page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  }

  hasCoarsePointer(): Promise<boolean> {
    return this.page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  }

  menuItem(name: string | RegExp, options: { readonly exact?: boolean } = {}): Locator {
    return this.page.getByRole('menuitem', { name, ...options });
  }

  menuItemRadio(name?: string | RegExp): Locator {
    return name === undefined
      ? this.page.getByRole('menuitemradio')
      : this.page.getByRole('menuitemradio', { name });
  }

  option(name: string): Locator {
    return this.page.getByRole('option', { name });
  }

  disabledInsertOptions(): Locator {
    return this.insertOptions().and(this.page.locator('[aria-disabled="true"]'));
  }

  lastLinkBar(): Locator {
    return this.page.locator('.nui-editor-link-bar').last();
  }

  linkBarForm(): Locator {
    return this.page.locator('.nui-editor-link-bar__edit');
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

  async caretAtEndOf(block: Locator): Promise<void> {
    await block.click();

    await block.evaluate((element) => {
      const range = document.createRange();

      range.selectNodeContents(element);
      range.collapse(false);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });
  }

  async clickBeside(block: Locator, side: 'start' | 'end' = 'end'): Promise<void> {
    await block.click({ trial: true });

    const [own, editor] = await Promise.all([boxOf(block), boxOf(this.content)]);

    await this.page.mouse.click(
      side === 'end' ? editor.x + editor.width - 4 : editor.x + 4,
      own.y + own.height / 2,
    );
  }

  async clickBelowContent(): Promise<void> {
    const last = this.content.locator(':scope > .nui-editor__chunk > *').last();

    await last.evaluate((block) => {
      globalThis.scrollBy(0, block.getBoundingClientRect().bottom - globalThis.innerHeight / 2);
    });

    const box = await boxOf(last);

    await this.page.mouse.click(box.x + 24, box.y + box.height + 16);
  }

  previewTexts(): Promise<string[]> {
    return this.preview.evaluate((root) =>
      [...root.children].map((child) => child.textContent ?? ''),
    );
  }

  async clear(): Promise<void> {
    await this.block(0).click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
  }

  async placeAtEnd(): Promise<void> {
    await this.content.evaluate((root) => {
      const last = [...root.querySelectorAll(':scope > .nui-editor__chunk > p')].at(-1) ?? root;
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

  private textPoints(text: string, before: string): Promise<{ from: Point; to: Point }> {
    return this.content.evaluate(
      (root, wanted) => {
        const rangeOf = (part: string): Range => {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

          for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
            const at = node.textContent?.indexOf(part) ?? -1;

            if (at !== -1) {
              const range = document.createRange();

              range.setStart(node, at);
              range.setEnd(node, at + part.length);
              return range;
            }
          }
          throw new Error(`No text reads ${part}`);
        };

        const source = rangeOf(wanted.text);
        const from = source.getBoundingClientRect();
        const to = rangeOf(wanted.before).getBoundingClientRect();

        root.focus();
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(source);

        return {
          from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
          to: { x: to.left + 1, y: to.top + to.height / 2 },
        };
      },
      { text, before },
    );
  }

  async dragText(text: string, before: string, modifier?: 'Control'): Promise<void> {
    const first = await this.textPoints(text, before);

    await this.page.mouse.move(first.from.x, first.from.y);

    const points = await this.textPoints(text, before);

    await this.page.mouse.move(points.from.x, points.from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(points.to.x, points.to.y, { steps: 8 });

    if (modifier !== undefined) {
      await this.page.keyboard.down(modifier);
    }

    await this.page.mouse.move(points.to.x, points.to.y);
    await this.page.mouse.up();

    if (modifier === undefined) {
      return;
    }

    await this.page.keyboard.up(modifier);
  }

  tool(name: string): Locator {
    return this.root
      .getByRole('toolbar', { name: 'Форматирование', exact: true })
      .getByRole('button', { name, exact: true });
  }

  async undoAllWith(key: string): Promise<void> {
    const undo = this.tool('Отменить');

    await undo.focus();

    while (await undo.isEnabled()) {
      await this.page.keyboard.press(key);
    }
  }

  bubble(): Locator {
    return this.root.locator('.nui-editor-bubble');
  }

  pushed(): Locator {
    return this.content.locator('.nui-editor__pushed');
  }

  async settled(block: Locator): Promise<void> {
    await block.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((each) => each.finished));

      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    });
  }

  selectionGap(): Promise<number> {
    return this.root.evaluate((root) => {
      const frame = root.querySelector('.nui-editor__range');
      const selection = document.getSelection();

      if (frame === null || selection === null || selection.rangeCount === 0) {
        return Number.NaN;
      }

      return Math.abs(
        frame.getBoundingClientRect().left - selection.getRangeAt(0).getBoundingClientRect().left,
      );
    });
  }

  codeLanguage(): Locator {
    return this.content.locator('.nui-editor-code__language > button').first();
  }

  codeLanguageOption(label: string): Locator {
    return this.content
      .locator('.nui-editor-code__languages')
      .first()
      .getByRole('option', { name: label });
  }

  codeToken(scope: string): Locator {
    return this.content.locator(`.nui-content__token--scope-${scope}`).first();
  }

  codeText(): Promise<string> {
    return this.content.locator('pre > code').first().innerText();
  }

  todoCheck(text: string): Locator {
    return this.content.getByRole('checkbox', { name: `Выполнено: ${text}` });
  }

  toggleButton(): Locator {
    return this.content.locator('.nui-editor-toggle__button');
  }

  toggle(): Locator {
    return this.content.locator('.nui-content__toggle');
  }

  toggleLine(text: string): Locator {
    return this.toggle().locator('p', { hasText: text });
  }

  async openToggle(): Promise<void> {
    await this.toggleButton().click();
    await expect(this.toggle()).toHaveClass(/nui-content__toggle--open/);
  }

  followsMouse(): Promise<boolean> {
    return this.page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  }

  async slidesAsideOnHover(block: Locator): Promise<boolean> {
    await slowMotion(this.root);
    await this.hoverStart(block);
    await expect(block).toHaveClass(/nui-editor__pushed/);

    const motions = [await motionOf(block, 'margin-left'), await motionOf(block, 'margin-right')];

    return motions.some((motion) => motion !== null);
  }

  calloutTone(): Locator {
    return this.content.locator('.nui-editor-callout__tone');
  }

  callout(): Locator {
    return this.content.locator('.nui-content__callout');
  }

  taskStatus(): Locator {
    return this.content.getByTestId('task-status');
  }

  publishedStatus(): Locator {
    return this.preview.locator('.task-status');
  }

  grip(): Locator {
    return this.root.locator('.nui-editor-handle--shown .nui-editor-handle__grip');
  }

  block(index: number): Locator {
    return this.content.locator('.nui-editor__chunk > *').nth(index);
  }

  lastBlock(): Locator {
    return this.content.locator(':scope > .nui-editor__chunk > *').last();
  }

  item(text: string): Locator {
    return this.content.locator('li', { hasText: text }).last();
  }

  async dragBlock(from: number, to: number): Promise<void> {
    await this.drag(this.block(from), this.block(to));
  }

  async hoverStart(block: Locator): Promise<void> {
    await block.scrollIntoViewIfNeeded();

    const box = await boxOf(block);
    const rtl = await block.evaluate((element) => getComputedStyle(element).direction === 'rtl');

    await this.page.mouse.move(rtl ? box.x + box.width - 4 : box.x + 4, box.y + 6);
  }

  async drag(source: Locator, target: Locator): Promise<void> {
    await source.evaluate((element) => {
      element.scrollIntoView({ block: 'center' });
    });

    await this.hoverStart(source);

    const grip = await boxOf(this.grip());
    const box = await boxOf(target);

    const x = grip.x + grip.width / 2;

    await this.page.mouse.move(x, grip.y + grip.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(x, grip.y + 30, { steps: 4 });
    await this.page.mouse.move(x, box.y + box.height - 2, { steps: 8 });
    await this.page.mouse.up();
  }

  async dragBeside(source: Locator, target: Locator): Promise<void> {
    await this.hoverStart(source);

    const grip = await boxOf(this.grip());
    const box = await boxOf(target);

    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 20, y + 10, { steps: 4 });
    await this.page.mouse.move(box.x + box.width - 8, box.y + box.height / 2, { steps: 10 });
    await this.page.mouse.up();
  }

  columns(): Locator {
    return this.content.locator('.nui-content__column');
  }

  table(): Locator {
    return this.content.locator('.nui-table');
  }

  tableBlock(): Locator {
    return this.content.locator('.nui-content__table');
  }

  publishedTable(): Locator {
    return this.preview.locator('.nui-table');
  }

  tableCell(row: number, col: number): Locator {
    return this.table().locator('tbody tr').nth(row).locator('td').nth(col);
  }

  async showTable(): Promise<void> {
    await this.content.locator('.nui-content__table').evaluate((block) => {
      block.scrollIntoView({ block: 'center' });
    });
  }

  tableHeads(table = this.table()): Promise<string[]> {
    return table
      .locator('thead th')
      .evaluateAll((cells) =>
        cells.map((cell) => cell.textContent?.trim() ?? '').filter((text) => text !== ''),
      );
  }

  tableColumn(table: Locator, col: number): Promise<string[]> {
    return table
      .locator('tbody tr')
      .evaluateAll(
        (rows, index) =>
          rows.map((row) =>
            (row.children[index]?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim(),
          ),
        col,
      );
  }

  async openColumnMenu(col: number): Promise<void> {
    const head = this.table().locator('thead th').nth(col);

    await head.evaluate((cell) => {
      cell.scrollIntoView({ block: 'center' });
    });

    await head.hover();
    await head.getByRole('button', { name: /^Меню колонки/u }).click();
  }

  tableAction(name: string): Locator {
    return this.root.locator('.nui-editor-table__actions').getByRole('button', { name });
  }

  renameField(): Locator {
    return this.root.locator('.nui-editor-table__rename input');
  }

  slashMenu(): Locator {
    return this.root.locator('.nui-editor-slash');
  }

  linkField(): Locator {
    return this.root.locator('.nui-editor-link input');
  }

  blockMenu(): Locator {
    return this.root.locator('.nui-editor-toolbar__blocks');
  }

  headerBlockMenu(): Locator {
    return this.root
      .getByRole('toolbar', { name: 'Форматирование', exact: true })
      .locator('.nui-editor-toolbar__blocks');
  }

  insertSearch(): Locator {
    return this.root.locator('.nui-editor-insert').getByRole('combobox');
  }

  insertOptions(): Locator {
    return this.root.locator('.nui-editor-insert').getByRole('option');
  }

  insertOption(name: string): Locator {
    return this.root.locator('.nui-editor-insert').getByRole('option', { name, exact: true });
  }

  anchors(): Locator {
    return this.content.locator('.nui-editor__comment');
  }

  async markSelection(): Promise<void> {
    await this.page.getByTestId('editor-anchor').click();
  }

  selectedAtoms(): Locator {
    return this.content.locator('.nui-editor__selected');
  }

  divider(): Locator {
    return this.content.locator('hr');
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

  async pasteFiles(files: readonly PastedFile[]): Promise<void> {
    await this.content.evaluate(async (root, list) => {
      const data = new DataTransfer();

      for (const file of list) {
        const canvas = document.createElement('canvas');

        canvas.width = 320;
        canvas.height = 200;

        const context = canvas.getContext('2d');

        if (context !== null) {
          context.fillStyle = '#5b7cfa';
          context.fillRect(0, 0, 320, 200);
        }

        const picture = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        const body = file.type.startsWith('image/') && picture !== null ? picture : 'x'.repeat(256);

        data.items.add(new File([body], file.name, { type: file.type }));
      }

      const event = new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });

      if (event.clipboardData?.files.length !== list.length) {
        Object.defineProperty(event, 'clipboardData', { value: data });
      }
      root.dispatchEvent(event);
    }, files);
  }

  uploadCards(): Locator {
    return this.content.locator('.nui-editor-upload');
  }

  image(source: string): Locator {
    return this.content
      .locator('.nui-content__image')
      .filter({ has: this.page.locator(`img[src${source}]`) });
  }

  file(name: string): Locator {
    return this.content.locator('.nui-content__file', { hasText: name });
  }

  announcement(): Locator {
    return this.root.locator('.nui-editor__live');
  }

  async replaceImage(
    image: Locator,
    file: { readonly name: string; readonly type: string },
  ): Promise<void> {
    await image.locator('img').click();

    await image.locator('.nui-editor-image__picker').setInputFiles({
      name: file.name,
      mimeType: file.type,
      buffer: Buffer.from('x'.repeat(256)),
    });
  }

  publishedImage(source: string): Locator {
    return this.preview
      .locator('.nui-content__image')
      .filter({ has: this.page.locator(`img[src${source}]`) });
  }

  async showCaret(): Promise<void> {
    await this.content.evaluate((root) => {
      const focus = document.getSelection()?.focusNode;
      const block = focus instanceof Element ? focus : focus?.parentElement;

      (block ?? root).scrollIntoView({ block: 'center' });
    });
  }

  isFocused(): Promise<boolean> {
    return this.content.evaluate((root) => root.ownerDocument.activeElement === root);
  }

  dock(): Locator {
    return this.root.locator('.nui-editor-toolbar--docked');
  }

  mentionList(): Locator {
    return this.root.locator('.nui-editor-mentions');
  }

  mentions(): Locator {
    return this.content.locator('.nui-content__mention');
  }

  publishedMentions(): Locator {
    return this.preview.locator('.nui-content__mention');
  }

  pasteMenu(): Locator {
    return this.root.locator('.nui-editor-paste');
  }

  mediaPanel(): Locator {
    return this.root.locator('.nui-editor-media');
  }

  bookmark(site: string): Locator {
    return this.content.locator('.nui-content__bookmark', { hasText: site });
  }

  publishedBookmark(site: string): Locator {
    return this.preview.locator('.nui-content__bookmark', { hasText: site });
  }

  linkBar(): Locator {
    return this.root.locator('.nui-editor-link-bar:popover-open');
  }

  liveLinksSwitch(): Locator {
    return this.page.getByTestId('editor-live-links');
  }

  async relink(url: string, title?: string): Promise<void> {
    await this.linkBar()
      .getByRole('button', { name: /^Изменить (ссылку|закладку)$/u })
      .click();

    const form = this.root.locator('.nui-editor-link-bar__edit');
    const address = form.getByRole('textbox', { name: 'Адрес' });

    await address.fill(url);
    if (title !== undefined) {
      await form.getByRole('textbox', { name: 'Заголовок' }).fill(title);
    }
    await address.press('Enter');
  }

  imageViewer(): Locator {
    return this.page.locator('.nui-content__viewer');
  }

  async gripBeside(block: Locator): Promise<boolean> {
    const [grip, target, frame] = await Promise.all([
      boxOf(this.grip()),
      boxOf(block),
      boxOf(this.frame),
    ]);

    return grip.x >= frame.x && grip.x + grip.width <= target.x;
  }

  async dragGrip(
    image: Locator,
    corner: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end',
    x: number,
    y: number,
  ): Promise<void> {
    await image.hover();

    const box = await boxOf(image.locator(`.nui-editor-image__grip--at-${corner}`));

    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(from.x + x, from.y + y, { steps: 6 });
    await this.page.mouse.up();
  }

  async imageAspect(image: Locator): Promise<number> {
    const box = await boxOf(image.locator('img'));

    return box.width / box.height;
  }
}
