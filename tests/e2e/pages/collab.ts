import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type WebSocketRoute,
} from '@playwright/test';
import { BookSection } from './book';

export interface TextEdges {
  readonly left: number;
  readonly right: number;
}

const COLLAB_SERVER = /:4175/;

const RECONNECT_TIMEOUT = 20_000;

export const unsentStepsOf = (name: string): Promise<number> =>
  new Promise<number>((resolve) => {
    const opening = indexedDB.open(`nui-offline:${name}`);

    opening.addEventListener('success', () => {
      const reading = opening.result.transaction('outbox').objectStore('outbox').get('current');

      reading.addEventListener('success', () => {
        const steps: unknown = reading.result?.steps;

        opening.result.close();
        resolve(Array.isArray(steps) ? steps.length : 0);
      });
    });
  });

export class CollabClient {
  private readonly sockets = new Set<WebSocketRoute>();
  private reachable = true;

  readonly editor: Locator;
  readonly status: Locator;
  readonly avatars: Locator;
  readonly carets: Locator;
  readonly selections: Locator;
  readonly comments: Locator;
  readonly threads: Locator;
  readonly discussions: Locator;
  readonly marks: Locator;
  readonly history: Locator;
  readonly versions: Locator;
  readonly additions: Locator;
  readonly overwritten: Locator;
  readonly report: Locator;
  readonly readOnlyDocument: Locator;

  constructor(
    readonly page: Page,
    readonly context: BrowserContext,
  ) {
    this.editor = page.locator('.nui-editor [contenteditable="true"]');
    this.status = page.getByTestId('collab-status');
    this.avatars = page.locator('.nui-avatar');
    this.carets = page.locator('.nui-collab-carets__caret');
    this.selections = page.locator('.nui-collab-selection');
    this.comments = page.locator('.nui-collab-comment-popover');
    this.threads = this.comments.locator('.nui-collab-comments__thread');
    this.discussions = page.locator('.collab__discussions');
    this.marks = page.locator('.nui-editor__comment');
    this.history = page.locator('.nui-collab-history');
    this.versions = this.history.getByRole('option');
    this.additions = this.history.locator('.nui-diff--added');
    this.overwritten = this.history.locator('.nui-collab-history__alternative');
    this.report = page.locator('.nui-collab-report');
    this.readOnlyDocument = page.locator('.nui-editor--readonly');
  }

  paragraph(index: number): Locator {
    return this.editor.locator('p').nth(index);
  }

  tableCell(row: number, col: number): Locator {
    return this.page.locator('.nui-editor .nui-table tbody tr').nth(row).locator('td').nth(col);
  }

  async insertTable(): Promise<void> {
    await this.editor.click();
    await this.page.keyboard.type('/table');
    await this.page.keyboard.press('Enter');
    await this.tableCell(0, 0).waitFor();
  }

  async setCell(row: number, col: number, text: string): Promise<void> {
    await this.tableCell(row, col).click();
    await this.page.keyboard.type(text);
    await this.page.keyboard.press('Enter');
  }

  async putBack(index: number): Promise<void> {
    await this.overwritten.nth(index).getByRole('button', { name: 'Вернуть' }).click();
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

  async addComment(body: string): Promise<void> {
    const fine = await this.page.evaluate(() => matchMedia('(pointer: fine)').matches);
    const bar = this.page.locator(fine ? '.nui-editor-bubble' : '.nui-editor__toolbar');

    await bar.getByRole('button', { name: 'Добавить комментарий' }).click();
    await this.comments.getByRole('textbox').fill(body);
    await this.comments.getByRole('button', { name: 'Отправить' }).click();
  }

  async clickAway(): Promise<void> {
    await this.status.click();
  }

  async openMark(index: number): Promise<void> {
    await this.marks.nth(index).click();
    await this.threads.waitFor();
  }

  async openDiscussions(): Promise<void> {
    await this.page.getByRole('button', { name: 'Обсуждения' }).click();
  }

  async pressInDiscussion(index: number, name: string): Promise<void> {
    await this.discussions
      .locator('.nui-collab-comments__thread')
      .nth(index)
      .getByRole('button', { name })
      .click();
  }

  async replyTo(index: number, body: string): Promise<void> {
    const thread = this.threads.nth(index);

    await thread.getByRole('button', { name: 'Ответить' }).click();
    await thread.getByRole('textbox').fill(body);
    await thread.getByRole('button', { name: 'Отправить' }).click();
  }

  async pressInThread(index: number, name: string): Promise<void> {
    await this.threads.nth(index).getByRole('button', { name }).click();
  }

  async saveVersion(count: number): Promise<void> {
    await this.history.getByRole('button', { name: 'Сохранить версию' }).click();
    await expect(this.versions).toHaveCount(count);
  }

  async pickVersion(index: number): Promise<void> {
    await this.versions.nth(index).click();
  }

  async restoreVersion(): Promise<void> {
    await this.history.getByRole('button', { name: 'Восстановить эту версию' }).click();
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

  async routeServer(): Promise<void> {
    await this.page.routeWebSocket(COLLAB_SERVER, (socket) => {
      if (this.reachable) {
        this.sockets.add(socket);
        socket.connectToServer();
      } else {
        void socket.close();
      }
    });
  }

  async disconnect(): Promise<void> {
    this.reachable = false;
    await Promise.all([...this.sockets].map((socket) => socket.close()));
    this.sockets.clear();
    await expect(this.status).toHaveText('offline');
  }

  async reconnect(): Promise<void> {
    this.reachable = true;
    await expect(this.status).toHaveText('online', { timeout: RECONNECT_TIMEOUT });
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.editor.waitFor();
  }

  async openWithPlugin(version: number): Promise<void> {
    const url = new URL(this.page.url());

    url.searchParams.set('plugin', String(version));
    await this.page.goto(url.toString());
  }

  unsentSteps(doc: string): Promise<number> {
    return this.page.evaluate(unsentStepsOf, doc);
  }

  leave(): Promise<void> {
    return this.context.close();
  }
}

export class CollabBook {
  readonly sheet: BookSection;

  constructor(readonly client: CollabClient) {
    this.sheet = new BookSection(client.page, 'collab-book');
  }

  get tabs(): Locator {
    return this.sheet.sheet.getByRole('tab');
  }

  get peers(): Locator {
    return this.client.page.getByTestId('collab-peers').locator('.nui-avatar');
  }

  peerFrame(name: string): Locator {
    return this.sheet.sheet.locator('.nui-spreadsheet__peer-cell', { hasText: name });
  }

  peerAreas(): Locator {
    return this.sheet.sheet.locator('.nui-spreadsheet__peer-area');
  }

  async undo(): Promise<void> {
    await this.client.page.keyboard.press('Control+z');
  }
}

export class CollabRoom {
  private readonly clients: CollabClient[] = [];

  constructor(
    private readonly browser: Browser,
    private readonly doc: string,
  ) {}

  get name(): string {
    return this.doc;
  }

  async joinOffline(user: string): Promise<CollabClient> {
    const client = await this.open(
      new URLSearchParams({ doc: this.doc, user, offline: '1' }),
      true,
    );

    await client.editor.waitFor();

    return client;
  }

  async join(user: string): Promise<CollabClient> {
    const client = await this.open(new URLSearchParams({ doc: this.doc, user }), false);

    await client.editor.waitFor();

    return client;
  }

  async joinBook(user: string): Promise<CollabBook> {
    const query = new URLSearchParams({ doc: `book-${this.doc}`, user, book: '1' });
    const client = await this.open(query, true);
    const book = new CollabBook(client);

    await book.sheet.grid.waitFor();

    return book;
  }

  private async open(query: URLSearchParams, routed: boolean): Promise<CollabClient> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    const client = new CollabClient(page, context);

    if (routed) {
      await client.routeServer();
    }

    this.clients.push(client);
    await page.goto(`/collab?${query.toString()}`);

    return client;
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.context.close()));
  }
}
