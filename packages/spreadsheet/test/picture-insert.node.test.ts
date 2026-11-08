import { describe, expect, it } from 'vite-plus/test';
import {
  DrawingAnchorKind,
  DrawingKind,
  createCalculator,
  createWorkbook,
  fittedPictureSize,
  insertDrawing,
  pictureAnchorAt,
  type SheetDrawing,
  type Workbook,
} from '../src/core';
import { MAX_COLS, MAX_ROWS } from '../src/core/address';
import { readWorkbook, writeWorkbook } from '../src/xlsx';

const BYTES = new TextEncoder().encode('png bytes');

const bookWith = (type: string): Workbook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Sales');

  sheet.layout = insertDrawing(sheet.layout, {
    id: 'new-1',
    name: 'Picture 1',
    alt: 'Logo',
    anchor: pictureAnchorAt(2, 3, { width: 200, height: 100 }),
    content: { kind: DrawingKind.Picture, media: 'new-1', type, bytes: BYTES },
  });

  return book;
};

const reread = async (book: Workbook): Promise<readonly SheetDrawing[]> => {
  const written = await writeWorkbook(book, createCalculator(book));

  if (!written.ok) {
    throw new Error('the workbook was refused');
  }

  const read = await readWorkbook(written.bytes);

  if (read.kind === 'rejected') {
    throw new Error(`the written package was rejected: ${read.reason}`);
  }
  return read.book.sheets[0]?.layout.drawings ?? [];
};

describe('picture placement', () => {
  it('keeps the size of a picture that fits', () => {
    expect(fittedPictureSize({ width: 120, height: 80 })).toEqual({ width: 120, height: 80 });
  });

  it('scales a large picture down and keeps its proportions', () => {
    expect(fittedPictureSize({ width: 960, height: 480 })).toEqual({ width: 480, height: 240 });
  });

  it('fits the room of a narrow view', () => {
    expect(fittedPictureSize({ width: 400, height: 400 }, { width: 200, height: 1000 })).toEqual({
      width: 200,
      height: 200,
    });
  });

  it('leaves at least one pixel of a very long picture', () => {
    expect(fittedPictureSize({ width: 10_000, height: 1 })).toEqual({ width: 480, height: 1 });
  });

  it('anchors a picture to one cell inside the sheet', () => {
    expect(pictureAnchorAt(MAX_ROWS + 5, MAX_COLS + 5, { width: 10, height: 20 })).toEqual({
      kind: DrawingAnchorKind.Cell,
      from: { row: MAX_ROWS - 1, col: MAX_COLS - 1, dx: 0, dy: 0 },
      width: 10,
      height: 20,
    });
  });
});

describe('writing a new picture', () => {
  it('stores the bytes in the package and reads them back', async () => {
    const [saved] = await reread(bookWith('image/png'));

    expect([saved?.name, saved?.alt, saved?.anchor]).toEqual([
      'Picture 1',
      'Logo',
      pictureAnchorAt(2, 3, { width: 200, height: 100 }),
    ]);

    expect(saved?.content).toEqual({
      kind: DrawingKind.Picture,
      media: 'xl/media/image1.png',
      type: 'image/png',
      bytes: BYTES,
    });
  });

  it('names a JPEG with its own extension', async () => {
    const [saved] = await reread(bookWith('image/jpeg'));

    expect(saved?.content).toMatchObject({ media: 'xl/media/image1.jpg', type: 'image/jpeg' });
  });

  it('leaves out a picture of a type the package cannot hold', async () => {
    expect(await reread(bookWith('image/tiff'))).toEqual([]);
  });
});
