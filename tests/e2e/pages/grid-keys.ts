import type { Page } from '@playwright/test';
import { ARROWS, type ArrowDirection } from '../helpers/keyboard';

export class GridKeys {
  constructor(protected readonly page: Page) {}

  async moveActive(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(ARROWS[direction]);
  }

  async extendSelection(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(`Shift+${ARROWS[direction]}`);
  }

  async jumpToDataEdge(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(`Control+${ARROWS[direction]}`);
  }

  async extendToDataEdge(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(`Control+Shift+${ARROWS[direction]}`);
  }

  async jumpToFirstCell(): Promise<void> {
    await this.page.keyboard.press('Control+Home');
  }

  async jumpToLastCell(): Promise<void> {
    await this.page.keyboard.press('Control+End');
  }

  async pageDown(): Promise<void> {
    await this.page.keyboard.press('PageDown');
  }

  async pageUp(): Promise<void> {
    await this.page.keyboard.press('PageUp');
  }

  async editActiveCell(): Promise<void> {
    await this.page.keyboard.press('F2');
  }

  async commitEdit(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }
}

export class SheetKeys extends GridKeys {
  async copySelection(): Promise<void> {
    await this.page.keyboard.press('Control+c');
  }

  async undo(): Promise<void> {
    await this.page.keyboard.press('Control+z');
  }

  async redo(): Promise<void> {
    await this.page.keyboard.press('Control+y');
  }
}
