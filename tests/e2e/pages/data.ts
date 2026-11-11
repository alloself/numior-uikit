import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import {
  isBoolean,
  isNumber,
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

export type DataOutput = Guarded<typeof isDataOutput>;

export interface CardTextBoxes {
  readonly title: number;
  readonly description: number;
}

const isDataOutput = shapeOf({
  picked: listOf(isString),
  channel: nullable(isString),
  cardClicks: isNumber,
  nestedClicks: isNumber,
  runs: isNumber,
  listEmpty: isBoolean,
});

const parseDataOutput = (text: string): DataOutput => parseAs(text, isDataOutput, 'data output');

export class DataSection {
  readonly scope = sectionScope('data');

  readonly badgeCount: Locator;
  readonly badgeDot: Locator;
  readonly badgeFloating: Locator;
  readonly avatarBroken: Locator;
  readonly avatarIcon: Locator;
  readonly avatarGroup: Locator;
  readonly cardLink: Locator;
  readonly cardButton: Locator;
  readonly cardNested: Locator;
  readonly cardSoft: Locator;
  readonly cardDense: Locator;
  readonly cardLoading: Locator;
  readonly cardLoadingToggle: Locator;
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
    this.cardSoft = page.getByTestId('data-card-soft');
    this.cardDense = page.getByTestId('data-card-dense');
    this.cardLoading = page.getByTestId('data-card-loading');
    this.cardLoadingToggle = page.getByTestId('data-card-loading-toggle').getByRole('switch');
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

  titleOf(item: Locator): Locator {
    return item.locator('.nui-row__title');
  }

  iconOf(item: Locator): Locator {
    return item.locator('.nui-row__leading');
  }

  descriptionOf(item: Locator): Locator {
    return item.locator('.nui-row__description');
  }

  action(list: Locator, name: string): Locator {
    return list.locator('.nui-list-item__action').filter({ hasText: name });
  }

  async clickSurface(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await boxOf(target);
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  focusRingOf(card: Locator): Promise<string> {
    return card
      .locator('.nui-card__action')
      .evaluate((element) => getComputedStyle(element, '::after').outlineStyle);
  }

  skeletonsOf(card: Locator): Locator {
    return card.locator('.nui-skeleton');
  }

  async textBoxesOf(card: Locator): Promise<CardTextBoxes> {
    const [title, description] = await Promise.all([
      boxOf(card.locator('.nui-card__title')),
      boxOf(card.locator('.nui-card__description')),
    ]);

    return { title: title.height, description: description.height };
  }

  async mediaCoverOf(card: Locator): Promise<number> {
    const [media, skeleton] = await Promise.all([
      boxOf(card.locator('.nui-card__media')),
      boxOf(card.locator('.nui-card__media .nui-skeleton')),
    ]);

    return (skeleton.width * skeleton.height) / (media.width * media.height);
  }

  insetOf(card: Locator): Promise<{ padding: number; gap: number }> {
    return card.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        padding: Number.parseFloat(style.paddingInlineStart),
        gap: Number.parseFloat(style.rowGap),
      };
    });
  }

  async typeIn(list: Locator, key: string): Promise<void> {
    await list.locator(':focus').dispatchEvent('keydown', { key });
  }

  async readOutput(): Promise<DataOutput> {
    return parseDataOutput(await this.output.innerText());
  }
}
