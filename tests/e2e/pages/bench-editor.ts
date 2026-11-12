import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';

const BLOCKS = 120;

export class BenchEditor {
  readonly text: Locator;
  readonly linkPanel: Locator;

  constructor(private readonly page: Page) {
    this.text = page.locator('.nui-editor [contenteditable="true"]');
    this.linkPanel = page.locator('.nui-editor-link');
  }

  async open(): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
    await this.page.goto(`/bench.html?view=editor&blocks=${String(BLOCKS)}`);
    await this.text.waitFor();
  }

  paragraph(index: number): Locator {
    return this.text.locator('p').nth(index);
  }

  async linkParagraph(index: number): Promise<void> {
    await this.paragraph(index).click();
    await this.page.keyboard.press('Home');
    await this.page.keyboard.press('Shift+End');
    await this.page.keyboard.press('ControlOrMeta+k');
    await this.linkPanel.waitFor();
  }

  async linkEverything(): Promise<void> {
    await this.text.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('ControlOrMeta+k');
    await this.linkPanel.waitFor();
  }

  async scrollText(by: number): Promise<void> {
    await this.text.evaluate((element, top) => {
      element.scrollBy({ top });
    }, by);
  }

  async scrollTextToMiddle(): Promise<void> {
    await this.text.evaluate((element) => {
      element.scrollTo({ top: (element.scrollHeight - element.clientHeight) / 2 });
    });
  }

  async panelBelow(index: number): Promise<number> {
    const [panel, paragraph] = await Promise.all([
      boxOf(this.linkPanel),
      boxOf(this.paragraph(index)),
    ]);

    return Math.round(panel.y - paragraph.y);
  }
}
