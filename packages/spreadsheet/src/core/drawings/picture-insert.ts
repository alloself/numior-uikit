import { MAX_COLS, MAX_ROWS } from '../address';
import { DrawingAnchorKind, type DrawingAnchor, type DrawingSize } from './drawing.types';

const PICTURE_ROOM: DrawingSize = { width: 480, height: 360 };

const LEAST_SIDE = 1;

export const PICTURE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/bmp',
];

export const fittedPictureSize = (
  natural: DrawingSize,
  room: DrawingSize = PICTURE_ROOM,
): DrawingSize => {
  const scale = Math.min(
    1,
    Math.min(room.width, PICTURE_ROOM.width) / natural.width,
    Math.min(room.height, PICTURE_ROOM.height) / natural.height,
  );

  return {
    width: Math.max(Math.round(natural.width * scale), LEAST_SIDE),
    height: Math.max(Math.round(natural.height * scale), LEAST_SIDE),
  };
};

export const pictureAnchorAt = (row: number, col: number, size: DrawingSize): DrawingAnchor => ({
  kind: DrawingAnchorKind.Cell,
  from: { row: Math.min(row, MAX_ROWS - 1), col: Math.min(col, MAX_COLS - 1), dx: 0, dy: 0 },
  ...size,
});
