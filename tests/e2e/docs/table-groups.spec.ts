import { expect, test } from '../fixtures';

const PAGES = [
  {
    path: '/components/table/data',
    first: 'В доставке',
    labels: ['В доставке (3)', 'Доставлен (4)', 'Ждёт оплаты (2)', 'Оплачен (2)', 'Отменён (1)'],
  },
  {
    path: '/en/components/table/data',
    first: 'Awaiting payment',
    labels: ['Awaiting payment (2)', 'Canceled (1)', 'Delivered (4)', 'Paid (2)', 'Shipped (3)'],
  },
];

const STATUS = 1;

const TOTAL = 3;

for (const { path, first, labels } of PAGES) {
  for (const width of [390, 1280]) {
    test(`the groups example on ${path} shows every label whole in the status column at ${width} px`, async ({
      docs,
      docsGroups,
      isMobile,
    }) => {
      test.skip(isMobile && width > 412, 'a phone keeps its own width');
      await docsGroups.resize(width);
      await docs.open(path);
      await docsGroups.root.scrollIntoViewIfNeeded();
      await expect(docsGroups.groupLabel(0)).toContainText(first);

      expect(await docsGroups.labelColumns()).toEqual(labels.map(() => STATUS));
      expect(await docsGroups.shownLabels()).toEqual(labels);
      expect(await docs.wcagViolations()).toEqual([]);
    });
  }
}

for (const { path } of PAGES) {
  test(`the groups example on ${path} fits 1280 px without a side scroll and shows the totals whole`, async ({
    docs,
    docsGroups,
    isMobile,
  }) => {
    test.skip(isMobile, 'a phone keeps its own width');
    await docsGroups.resize(1280);
    await docs.open(path);
    await docsGroups.root.scrollIntoViewIfNeeded();
    await expect(docsGroups.groupLabel(0)).toBeVisible();

    expect(await docsGroups.sideScroll()).toBe(0);
    expect(await docsGroups.columnInside(TOTAL)).toBe(true);
  });
}
