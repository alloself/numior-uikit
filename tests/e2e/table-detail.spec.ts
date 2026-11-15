import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

const ITEM_KINDS = 6;

test.describe('table detail rows', () => {
  test('opens a detail with a nested table from the chevron and keeps its clicks to itself', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();

    await expect(detail.grid).toHaveRole('treegrid');
    await expect(detail.row(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(detail.toggle(5)).toHaveCount(0);

    await detail.toggle(1).click();

    await expect(detail.row(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(detail.cell(1, 0)).not.toBeFocused();
    await expect(detail.row(2)).toHaveAttribute('aria-level', '2');
    await expect(detail.panel(2)).toBeVisible();
    await expect(detail.nestedCell(2, 0, 0)).toHaveText('Блендер');
    await expect(detail.cell(3, 1)).toHaveText('Зелёный дом');
    expect((await detail.readOutput()).expanded).toEqual([2]);

    await detail.nestedCell(2, 1, 0).click();
    await detail.openButton(2).click();

    await expect.poll(async () => (await detail.readOutput()).opened).toBe(2);
    expect((await detail.readOutput()).lastClick).toBeNull();

    await detail.toggle(1).click();
    await expect(detail.panel(2)).toHaveCount(0);
    await expect(detail.cell(2, 1)).toHaveText('Зелёный дом');
  });

  test('counts the measured detail in the scroll height of the row window', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    const closed = await detail.scrollHeight();

    await detail.toggle(1).click();
    await expect(detail.panel(2)).toBeVisible();

    const { height } = await boxOf(detail.row(2));

    await expect
      .poll(async () => Math.abs((await detail.scrollHeight()) - closed - height))
      .toBeLessThanOrEqual(1);

    await detail.scrollTo(40_000);
    await expect(detail.panel(2)).toHaveCount(0);

    await detail.scrollTo(0);
    await expect(detail.nestedCell(2, 1, 0)).toHaveText('Весы');
    expect(Math.abs((await detail.scrollHeight()) - closed - height)).toBeLessThanOrEqual(1);
  });

  test('keeps the row under the header in place while details above it are measured', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();

    await detail.scrollTo(40_000);
    await expect(detail.cell(1000, 0)).toHaveText('1001');

    await detail.openFirst.click();
    await detail.scrollTo(680);
    await expect(detail.panel(3)).toBeAttached();
    await expect.poll(async () => (await detail.topRow())?.text).toBe('6');
    expect(Math.abs((await detail.topRow())?.gap ?? 99)).toBeLessThanOrEqual(1);
  });

  test('walks into the detail and its nested table from the keyboard and back', async ({
    tableDetail: detail,
    playground,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();

    await detail.cell(1, 0).focus();
    await detail.expandFocusedRow();
    await expect(detail.panel(2)).toBeVisible();

    await detail.moveFocus('right');
    await detail.moveFocus('down');
    await expect(detail.cell(2, 0)).toBeFocused();

    await detail.tabIntoDetail();

    await expect(detail.nestedCell(2, 0, 0)).toBeFocused();

    await detail.moveFocus('down');
    await expect(detail.nestedCell(2, 1, 0)).toBeFocused();
    await expect(detail.cell(2, 0)).toHaveAttribute('tabindex', '0');

    await detail.tabOutOfDetail();

    await expect(detail.cell(2, 0)).toBeFocused();

    await detail.moveFocus('down');
    await expect(detail.cell(3, 1)).toBeFocused();
  });

  test('keeps the detail inside the visible width while the table scrolls sideways', async ({
    tableDetail: detail,
    playground,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the columns overflow on a phone');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();

    await detail.toggle(1).tap();
    await expect(detail.panel(2)).toBeVisible();

    for (const direction of ['ltr', 'rtl'] as const) {
      await playground.setDirection(direction);
      await detail.scrollAcross();
      expect(await detail.scrolledAcross()).toBe(true);

      const frame = await boxOf(detail.viewport);
      const panel = await boxOf(detail.panel(2));

      expect(panel.x).toBeGreaterThanOrEqual(frame.x);
      expect(panel.x + panel.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    }

    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('scrolls sideways no further than its columns reach', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    await expect(detail.cell(1, 1)).toBeVisible();

    expect(await detail.scrollPastColumns()).toBe(0);

    await playground.setDirection('rtl');

    expect(await detail.scrollPastColumns()).toBe(0);
  });

  test('shows details in a paged table without a row window', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();

    await detail.windowSwitch.click();
    await detail.openFirst.click();
    await expect(detail.panel(1)).toBeVisible();
    await expect(detail.panel(3)).toBeVisible();
    await expect(detail.grid).toHaveAttribute('aria-rowcount', '14');

    await detail.closeAll.click();
    await expect(detail.panel(1)).toHaveCount(0);
    await expect(detail.grid).toHaveAttribute('aria-rowcount', '11');
  });

  test('sizes the rows of a window by their content and keeps the row under the header in place', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    const plain = await boxOf(detail.row(1));

    await detail.fluidSwitch.click();

    await expect
      .poll(async () => (await boxOf(detail.row(1))).height)
      .toBeGreaterThan(plain.height);

    expect((await boxOf(detail.row(2))).height).toBeCloseTo(plain.height, 3);
    expect(await detail.largestRowGap()).toBeLessThanOrEqual(0.5);

    await detail.scrollTo(30_000);

    await expect.poll(async () => Number((await detail.topRow())?.text)).toBeGreaterThan(600);

    await expect.poll(async () => (await detail.topRow())?.gap ?? 99).toBeLessThanOrEqual(0.5);

    const settled = await detail.topRow();

    await detail.waitForLateLayout();
    expect(await detail.topRow()).toEqual(settled);
    expect(await detail.largestRowGap()).toBeLessThanOrEqual(0.5);

    await detail.scrollToEnd();

    await expect(detail.cell(1999, 0)).toHaveText('2000');

    await expect
      .poll(async () => {
        const last = await boxOf(detail.row(1999));

        return Math.abs(last.y + last.height - (await detail.bodyEdges()).bottom);
      })
      .toBeLessThanOrEqual(1);
  });

  test('keeps a row among measured rows in place when its detail opens', async ({
    tableDetail: detail,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    await detail.fluidSwitch.click();
    await detail.scrollTo(30_000);
    await expect.poll(async () => (await detail.topRow())?.gap ?? 99).toBeLessThanOrEqual(0.5);

    const below = Number((await detail.topRow())?.text) + 1;
    const position = (below + 1) % ITEM_KINDS === 0 ? below + 1 : below;
    const before = await boxOf(detail.row(position));

    await detail.toggle(position).click();
    await expect(detail.row(position)).toHaveAttribute('aria-expanded', 'true');
    await expect(detail.panel(position + 1)).toBeVisible();

    await expect
      .poll(async () => Math.abs((await boxOf(detail.row(position))).y - before.y))
      .toBeLessThanOrEqual(1);

    expect(await detail.largestRowGap()).toBeLessThanOrEqual(0.5);

    await detail.toggle(position).click();
    await expect(detail.panel(position + 1)).toHaveCount(0);

    await expect
      .poll(async () => Math.abs((await boxOf(detail.row(position))).y - before.y))
      .toBeLessThanOrEqual(1);
  });

  test('keeps the focused cell in view while the arrows walk rows of different heights', async ({
    tableDetail: detail,
    playground,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    await detail.fluidSwitch.click();
    await detail.cell(0, 1).click();

    for (let step = 1; step <= 14; step += 1) {
      await detail.moveFocus('down');
      await expect(detail.cell(step, 1)).toBeFocused();

      const edges = await detail.bodyEdges();
      const cell = await boxOf(detail.cell(step, 1));

      expect(cell.y).toBeGreaterThanOrEqual(edges.top - 1);
      expect(cell.y + cell.height).toBeLessThanOrEqual(edges.bottom + 1);
    }
  });

  test('open details have no automatically detectable WCAG AA violations', async ({
    tableDetail: detail,
    playground,
    tableDetail,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await detail.root.scrollIntoViewIfNeeded();
    await detail.openFirst.click();
    await expect(detail.panel(1)).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(tableDetail.scope)).toEqual([]);
    }
  });
});
