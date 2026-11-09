import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';

export interface TextEdges {
  readonly left: number;
  readonly right: number;
}

export class CollabClient {
  readonly editor: Locator;
  readonly status: Locator;
  readonly avatars: Locator;
  readonly carets: Locator;
  readonly selections: Locator;

  constructor(
    readonly page: Page,
    readonly context: BrowserContext,
  ) {
    this.editor = page.locator('.nui-editor [contenteditable="true"]');
    this.status = page.getByTestId('collab-status');
    this.avatars = page.locator('.nui-avatar');
    this.carets = page.locator('.nui-collab-carets__caret');
    this.selections = page.locator('.nui-collab-selection');
  }

  paragraph(index: number): Locator {
    return this.editor.locator('p').nth(index);
  }

  caretOf(name: string): Locator {
    return this.carets.filter({ hasText: name });
  }

  async write(text: string): Promise<void> {
    await this.editor.click();
    await this.page.keyboard.type(text);
  }

  async newLine(text: string): Promise<void> {
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type(text);
  }

  async appendTo(index: number, text: string): Promise<void> {
    await this.paragraph(index).click();
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(text);
  }

  async selectLine(index: number): Promise<void> {
    await this.paragraph(index).click();
    await this.page.keyboard.press('Home');
    await this.page.keyboard.press('Shift+End');
  }

  text(): Promise<string> {
    return this.editor.innerText();
  }

  textEdges(index: number): Promise<TextEdges> {
    return this.paragraph(index).evaluate((element) => {
      const range = element.ownerDocument.createRange();

      range.selectNodeContents(element);

      const { left, right } = range.getBoundingClientRect();

      return { left, right };
    });
  }

  async setDirection(direction: 'ltr' | 'rtl'): Promise<void> {
    await this.page.evaluate((value) => {
      document.documentElement.dir = value;
    }, direction);
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await this.page.evaluate((value) => {
      document.documentElement.setAttribute('data-nui-theme', value);
    }, theme);
  }

  leave(): Promise<void> {
    return this.context.close();
  }
}

export class CollabRoom {
  private readonly clients: CollabClient[] = [];

  constructor(
    private readonly browser: Browser,
    private readonly doc: string,
  ) {}

  async join(user: string): Promise<CollabClient> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    const client = new CollabClient(page, context);
    const query = new URLSearchParams({ doc: this.doc, user });

    this.clients.push(client);
    await page.goto(`/collab.html?${query.toString()}`);
    await client.editor.waitFor();

    return client;
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.context.close()));
  }
}
