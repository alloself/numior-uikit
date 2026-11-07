interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const AREA_WIDTH = 100;

const AREA_HEIGHT = 120;

const LIST_HEIGHT = 100;

const CHIP_TOP = 24;

const CHIP_STEP = 28;

const CHIP_HEIGHT = 24;

const rectOf = (box: Box): DOMRect => ({
  x: box.left,
  y: box.top,
  left: box.left,
  top: box.top,
  width: box.width,
  height: box.height,
  right: box.left + box.width,
  bottom: box.top + box.height,
  toJSON: () => box,
});

const place = (element: Element, box: Box): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rectOf(box),
  });
};

export const layOutPivot = (panel: Element): void => {
  place(panel, { left: 0, top: 0, width: AREA_WIDTH * 2, height: LIST_HEIGHT + AREA_HEIGHT * 2 });

  const list = panel.querySelector('.nui-spreadsheet-pivot__fields');

  if (list !== null) {
    place(list, { left: 0, top: 0, width: AREA_WIDTH * 2, height: LIST_HEIGHT });
  }

  panel.querySelectorAll('.nui-spreadsheet-pivot__field').forEach((field, index) => {
    place(field, { left: 0, top: index * 20, width: AREA_WIDTH * 2, height: 20 });
  });

  panel.querySelectorAll('.nui-spreadsheet-pivot__area').forEach((area, index) => {
    const left = (index % 2) * AREA_WIDTH;
    const top = LIST_HEIGHT + Math.floor(index / 2) * AREA_HEIGHT;

    place(area, { left, top, width: AREA_WIDTH, height: AREA_HEIGHT });

    area.querySelectorAll('.nui-spreadsheet-pivot__chip').forEach((chip, at) => {
      place(chip, {
        left: left + 8,
        top: top + CHIP_TOP + at * CHIP_STEP,
        width: AREA_WIDTH - 16,
        height: CHIP_HEIGHT,
      });
    });
  });

  ['setPointerCapture', 'releasePointerCapture'].forEach((name) => {
    Object.defineProperty(panel, name, { configurable: true, value: () => undefined });
  });

  Object.defineProperty(panel, 'hasPointerCapture', { configurable: true, value: () => true });
};

export const centreOf = (element: Element): { readonly x: number; readonly y: number } => {
  const box = element.getBoundingClientRect();

  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};
