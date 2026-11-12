import { ImagePlus } from '@lucide/vue';
import type { NuiMenuEntry } from '@numior/vue';
import { useFileDialog } from '@vueuse/core';
import { markRaw } from 'vue';
import {
  DrawingKind,
  PICTURE_TYPES,
  fittedPictureSize,
  freshDrawingId,
  insertDrawing,
  pictureAnchorAt,
  type DrawingSize,
} from '../../core';
import { applyLayout } from '../sheet-layout-step';
import { NuiSpreadsheetRefusalReason } from '../sheet.types';
import type { DrawingInsertOptions, PictureInsert } from './drawings.types';
import { useSheetInsertSpot } from './use-sheet-insert-spot';

const INSERT_ICON = markRaw(ImagePlus);

const IMAGE_PREFIX = 'image/';

const naturalSize = async (file: Blob): Promise<DrawingSize | undefined> => {
  const bitmap = await createImageBitmap(file).catch(() => undefined);
  const size = bitmap === undefined ? undefined : { width: bitmap.width, height: bitmap.height };

  bitmap?.close();
  return size;
};

const pastedImage = (data: DataTransfer | null): File | undefined =>
  data === null || data.getData('text/plain') !== ''
    ? undefined
    : [...data.files].find((file) => file.type.startsWith(IMAGE_PREFIX));

export const useSheetPictureInsert = (options: DrawingInsertOptions): PictureInsert => {
  const spot = useSheetInsertSpot(options);

  const dialog = useFileDialog({
    accept: PICTURE_TYPES.join(','),
    multiple: false,
    reset: true,
  });

  const place = (type: string, bytes: Uint8Array, natural: DrawingSize): void => {
    const sheet = options.sheet();

    if (sheet === undefined) {
      return;
    }

    const id = freshDrawingId(sheet.layout);
    const name = options.messages().pictureName({ index: sheet.layout.drawings.length + 1 });
    const size = fittedPictureSize(natural, spot.room());
    const at = spot.start() ?? { row: 0, col: 0 };

    const layout = insertDrawing(sheet.layout, {
      id,
      name,
      alt: '',
      anchor: pictureAnchorAt(at.row, at.col, size),
      content: { kind: DrawingKind.Picture, media: id, type, bytes },
    });

    if (!applyLayout(options.editing, sheet, layout)) {
      return;
    }

    options.select(id, name);
  };

  const insert = async (file: File): Promise<void> => {
    const natural = PICTURE_TYPES.includes(file.type) ? await naturalSize(file) : undefined;

    if (natural === undefined) {
      options.refuse(NuiSpreadsheetRefusalReason.PictureFile, options.messages().pictureRefused);
      return;
    }
    place(file.type, new Uint8Array(await file.arrayBuffer()), natural);
  };

  const canInsert = (): boolean => !options.readonly() && options.editing.draft.value === undefined;

  dialog.onChange((files) => {
    const file = files?.[0];

    if (file === undefined) {
      return;
    }

    void insert(file);
  });

  const onPaste = (event: ClipboardEvent): void => {
    const file = pastedImage(event.clipboardData);

    if (file === undefined || !canInsert()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void insert(file);
  };

  const tools = (): readonly NuiMenuEntry[] =>
    options.readonly()
      ? []
      : [
          {
            key: 'picture-insert',
            label: options.messages().insertPicture,
            icon: INSERT_ICON,
            onSelect: () => {
              dialog.open();
            },
          },
        ];

  return { tools, onPaste };
};
