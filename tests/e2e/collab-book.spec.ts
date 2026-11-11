import { expect, test } from './fixtures';
import { wcagViolationsOf } from './helpers/axe';
import { boxOf } from './helpers/geometry';

const ANNA = 'Анна';

const BORIS = 'Борис';

const THEMES = ['light', 'dark'] as const;

test.describe('collaboration on a workbook', () => {
  test('shows a value and recalculates a formula written by someone else', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.enter('1', 0, '2');
    await expect(boris.sheet.cell('1', 0)).toHaveText('2');

    await boris.sheet.enter('1', 1, '=A1*3');
    await expect(anna.sheet.cell('1', 1)).toHaveText('6');

    await anna.sheet.enter('1', 0, '5');
    await expect(boris.sheet.cell('1', 1)).toHaveText('15');
  });

  test('shows where someone else stands and who is here', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await expect(anna.peers).toHaveCount(1);
    await expect(boris.peers).toHaveCount(1);

    await anna.sheet.cell('3', 1).click();

    await expect(boris.peerFrame(ANNA)).toBeVisible();

    await expect
      .poll(async () => {
        const frame = await boxOf(boris.peerFrame(ANNA));
        const cell = await boxOf(boris.sheet.cell('3', 1));

        return Math.abs(frame.x - cell.x) + Math.abs(frame.y - cell.y);
      })
      .toBeLessThan(2);
  });

  test('puts the frame of someone else on its new cell at once', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.cell('3', 1).click();
    await expect(boris.peerFrame(ANNA)).toBeVisible();

    const stops = await boris.peerFrameStops(ANNA, () => anna.sheet.cell('3', 4).click());

    expect(stops).toBe(1);
  });

  test('stops showing a frame once its owner goes to another sheet', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.cell('2', 0).click();
    await expect(boris.peerFrame(ANNA)).toBeVisible();

    await anna.sheet.addSheetButton.click();

    await expect(boris.tabs).toHaveCount(2);
    await expect(boris.peerFrame(ANNA)).toHaveCount(0);
    await expect(boris.peers).toHaveCount(1);
  });

  test('says why a book lost sync and opens it again from the server', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.enter('1', 0, '2');
    await expect(boris.sheet.cell('1', 0)).toHaveText('2');

    await anna.client.loseSync();

    await expect(anna.client.failure).toContainText('Правки больше не отправляются');
    expect(await wcagViolationsOf(anna.client.page)).toEqual([]);

    await boris.sheet.enter('1', 1, '7');
    await anna.client.openAgain();

    await expect(anna.client.failure).toHaveCount(0);
    await expect(anna.sheet.cell('1', 1)).toHaveText('7');
  });

  test('takes a write back for everyone', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.enter('2', 0, 'черновик');
    await expect(boris.sheet.cell('2', 0)).toHaveText('черновик');

    await anna.undo();

    await expect(boris.sheet.cell('2', 0)).toHaveText('');
    await expect(anna.sheet.cell('2', 0)).toHaveText('');
  });

  test('moves a write made offline past a row inserted by someone else', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.client.disconnect();
    await anna.sheet.enter('3', 0, 'моё');
    await boris.sheet.cellMenu('1', 0, 'Вставить 1 строку выше');
    await boris.sheet.enter('6', 0, 'Борис');
    await expect(anna.sheet.cell('6', 0)).toHaveText('');

    await anna.client.reconnect();

    await expect(anna.sheet.cell('4', 0)).toHaveText('моё');
    await expect(boris.sheet.cell('4', 0)).toHaveText('моё');
    await expect(anna.sheet.cell('6', 0)).toHaveText('Борис');
  });

  test('adds a sheet for everyone', async ({ collab }) => {
    const anna = await collab.joinBook(ANNA);
    const boris = await collab.joinBook(BORIS);

    await anna.sheet.addSheetButton.click();

    await expect(boris.tabs).toHaveCount(2);
  });

  for (const theme of THEMES) {
    test(`stays accessible in the ${theme} theme`, async ({ collab }) => {
      const anna = await collab.joinBook(ANNA);

      await anna.client.setTheme(theme);
      await anna.sheet.enter('1', 0, 'значение');

      expect(await wcagViolationsOf(anna.client.page)).toEqual([]);
    });
  }
});
