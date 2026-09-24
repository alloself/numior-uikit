import type { Locator, Page } from '@playwright/test';

export interface DataOutput {
  readonly picked: readonly string[];
  readonly channel: string | null;
  readonly cardClicks: number;
  readonly nestedClicks: number;
  readonly runs: number;
  readonly listEmpty: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isDataOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & DataOutput =>
  isStringList(data.picked) &&
  (data.channel === null || typeof data.channel === 'string') &&
  typeof data.cardClicks === 'number' &&
  typeof data.nestedClicks === 'number' &&
  typeof data.runs === 'number' &&
  typeof data.listEmpty === 'boolean';

const parseDataOutput = (text: string): DataOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isDataOutput(data)) {
    throw new Error(`Unexpected data output: ${text}`);
  }
  return data;
};

export class DataSection {
  readonly badgeCount: Locator;
  readonly badgeDot: Locator;
  readonly badgeFloating: Locator;
  readonly avatarBroken: Locator;
  readonly avatarIcon: Locator;
  readonly avatarGroup: Locator;
  readonly cardLink: Locator;
  readonly cardButton: Locator;
  readonly cardNested: Locator;
  readonly list: Locator;
  readonly selectList: Locator;
  readonly singleList: Locator;
  readonly tasksList: Locator;
  readonly listToggle: Locator;
  readonly empty: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.badgeCount = page.getByTestId('data-badge-count');
    this.badgeDot = page.getByTestId('data-badge-dot');
    this.badgeFloating = page.getByTestId('data-badge-floating');
    this.avatarBroken = page.getByTestId('data-avatar-broken');
    this.avatarIcon = page.getByTestId('data-avatar-icon');
    this.avatarGroup = page.getByTestId('data-avatar-group');
    this.cardLink = page.getByTestId('data-card-link');
    this.cardButton = page.getByTestId('data-card-button');
    this.cardNested = page.getByTestId('data-card-nested');
    this.list = page.getByTestId('data-list');
    this.selectList = page.getByTestId('data-list-select');
    this.singleList = page.getByTestId('data-list-single');
    this.tasksList = page.getByTestId('data-list-tasks');
    this.listToggle = page.getByTestId('data-list-toggle');
    this.empty = page.getByTestId('data-empty');
    this.output = page.getByTestId('data-output');
  }

  option(list: Locator, name: string): Locator {
    return list.getByRole('option', { name });
  }

  async clickSurface(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) {
      throw new Error('Card surface is not rendered');
    }
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  focusRingOf(card: Locator): Promise<string> {
    return card
      .locator('.nui-card__action')
      .evaluate((element) => getComputedStyle(element, '::after').outlineStyle);
  }

  async typeIn(list: Locator, key: string): Promise<void> {
    await list.locator(':focus').dispatchEvent('keydown', { key });
  }

  async readOutput(): Promise<DataOutput> {
    return parseDataOutput(await this.output.innerText());
  }
}
