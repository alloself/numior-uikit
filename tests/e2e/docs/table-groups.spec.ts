import { expect, test } from '../fixtures';

const LABELS = ['В доставке (3)', 'Доставлен (4)', 'Ждёт оплаты (2)', 'Оплачен (2)', 'Отменён (1)'];

for (const width of [390, 1280]) {
  test(`the groups example starts every group label at the row start and shows it whole at ${width} px`, async ({
    docs,
    docsGroups,
    isMobile,
  }) => {
    test.skip(isMobile && width > 412, 'a phone keeps its own width');
    await docsGroups.resize(width);
    await docs.open('/table/data');
    await docsGroups.root.scrollIntoViewIfNeeded();
    await expect(docsGroups.groupLabel(0)).toContainText('В доставке');

    expect(await docsGroups.shownLabels()).toEqual(LABELS);
    expect(await docs.wcagViolations()).toEqual([]);
  });
}
