import { expect, type Frame, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { unsentStepsOf } from './collab';

type PaneSide = 'left' | 'right';

export class LabPane {
  private readonly content: FrameLocator;
  private readonly owner: Locator;

  readonly editor: Locator;
  readonly status: Locator;
  readonly link: Locator;
  readonly carets: Locator;
  readonly grid: Locator;
  readonly cellEditor: Locator;
  readonly reloadButton: Locator;

  constructor(
    private readonly page: Page,
    side: PaneSide,
    name: string,
  ) {
    this.owner = page.getByTestId(`collab-lab-${side}`);
    this.content = this.owner.contentFrame();
    this.editor = this.content.locator('.nui-editor [contenteditable="true"]');
    this.status = this.content.getByTestId('collab-status');
    this.link = this.content.getByRole('switch', { name: 'Связь' });
    this.carets = this.content.locator('.nui-collab-carets__caret');
    this.grid = this.content.getByRole('grid');
    this.cellEditor = this.grid.locator('.nui-table__editor input');

    this.reloadButton = page
      .locator('.collab-lab__pane', { hasText: name })
      .getByRole('button', { name: 'Перезагрузить' });
  }

  async write(text: string): Promise<void> {
    await this.editor.click();
    await this.page.keyboard.type(text);
  }

  cell(row: string, column: number): Locator {
    const header = this.content.getByRole('rowheader', { name: row, exact: true });

    return this.grid
      .getByRole('row')
      .filter({ has: header })
      .locator(`[aria-colindex="${String(column + 2)}"]`);
  }

  async enter(row: string, column: number, text: string): Promise<void> {
    await this.cell(row, column).click();
    await this.page.keyboard.press('F2');
    await this.cellEditor.fill(text);
    await this.page.keyboard.press('Enter');
  }

  async insertRowAbove(row: string, column: number): Promise<void> {
    await this.cell(row, column).click({ button: 'right' });
    await this.content.getByRole('menuitem', { name: 'Вставить 1 строку выше' }).click();
  }

  async cutLink(): Promise<void> {
    await this.link.click();
    await expect(this.status).toHaveText('offline');
  }

  async restoreLink(): Promise<void> {
    await this.link.click();
    await expect(this.status).toHaveText('online');
  }

  async reload(): Promise<void> {
    await this.reloadButton.click();
    await this.editor.waitFor();
  }

  private async frame(): Promise<Frame> {
    const frame = await (await this.owner.elementHandle())?.contentFrame();

    if (frame === undefined || frame === null) {
      throw new Error('The pane has no frame');
    }
    return frame;
  }

  async unsentSteps(): Promise<number> {
    const frame = await this.frame();
    const doc = new URL(frame.url()).searchParams.get('doc') ?? '';

    return frame.evaluate(unsentStepsOf, doc);
  }
}

export class CollabLab {
  readonly left: LabPane;
  readonly right: LabPane;

  constructor(private readonly page: Page) {
    this.left = new LabPane(page, 'left', 'Анна');
    this.right = new LabPane(page, 'right', 'Борис');
  }

  async open(): Promise<void> {
    await this.page.goto('/collab');
    await this.left.editor.waitFor();
    await this.right.editor.waitFor();
  }

  async showBook(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Книга' }).click();
    await this.left.grid.waitFor();
    await this.right.grid.waitFor();
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await this.page.emulateMedia({ colorScheme: theme });
  }
}
