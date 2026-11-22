import { afterEach, describe, expect, it } from 'vite-plus/test';
import { WorkbookSessionDriver } from './workbook-session-driver';

let session: WorkbookSessionDriver | undefined;

const opened = async (): Promise<WorkbookSessionDriver> => {
  session = await WorkbookSessionDriver.mount();
  return session;
};

afterEach(() => {
  session?.unmount();
  session = undefined;
});

describe('a shared book opened with useCollabWorkbook', () => {
  it('shows the book once the server sends it and sends the edits made in it', async () => {
    const book: WorkbookSessionDriver = await opened();

    expect(book.shown).toBe(false);

    await book.welcome([[0, 0, 'Rent']], 3);

    expect(book.shown).toBe(true);
    expect(book.text(1, 0)).toBe('Rent');

    await book.enter(2, 0, 'Food');

    expect(book.text(2, 0)).toBe('Food');
    expect(book.sentSteps).toBe(1);
  });

  it('closes the book for writing and says why when the server refuses a change', async () => {
    const book: WorkbookSessionDriver = await opened();

    await book.welcome([[0, 0, 'Rent']], 3);
    await book.enter(2, 0, 'Food');
    await book.refuseChange(3);

    expect(book.alert).toContain('Your changes are no longer sent');
    expect(book.alert).toContain('1 change of yours was not sent');
    expect(book.text(2, 0)).toBe('Food');
    await expect(book.opensForEditing(1, 0)).resolves.toBe(false);
  });

  it('opens the book from the server again without a reload and drops the refused change', async () => {
    const book: WorkbookSessionDriver = await opened();

    await book.welcome([[0, 0, 'Rent']], 3);
    await book.enter(2, 0, 'Food');
    await book.refuseChange(3);
    await book.openAgain();

    expect(book.alert).toBeUndefined();
    expect(book.shown).toBe(true);
    await expect(book.opensForEditing(1, 0)).resolves.toBe(false);

    await book.welcome(
      [
        [0, 0, 'Rent'],
        [0, 1, 'Taxes'],
      ],
      5,
    );

    expect(book.helloVersions).toEqual([null, null]);
    expect(book.text(1, 1)).toBe('Taxes');
    expect(book.text(2, 0)).toBe('');
    await expect(book.opensForEditing(1, 0)).resolves.toBe(true);
  });

  it('tells the others where it stands again after the book is opened again', async () => {
    const book: WorkbookSessionDriver = await opened();

    await book.welcome([[0, 0, 'Rent']], 3);
    await book.enter(2, 0, 'Food');
    await book.refuseChange(3);
    await book.stepOn(3, 2);
    await book.openAgain();
    await book.welcome([[0, 0, 'Rent']], 5);
    await book.waitForPresence();

    expect(book.toldPlacesSinceHello).toEqual(['plan!2:2']);
  });

  it('opens no connection while it renders on the server', async () => {
    await expect(WorkbookSessionDriver.renderOnServer()).resolves.toBe(0);
  });
});
