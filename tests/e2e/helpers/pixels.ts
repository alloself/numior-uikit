import type { Locator, Page } from '@playwright/test';

export interface KitBox {
  readonly name: string;
  readonly icon: boolean;
  readonly width: number;
  readonly height: number;
  readonly dx: number;
  readonly dy: number;
}

export interface KitLine {
  readonly name: string;
  readonly height: number;
  readonly top: number;
}

export interface KitPixels {
  readonly boxes: readonly KitBox[];
  readonly lines: readonly KitLine[];
}

const KIT_BOXES = '[class*="nui-"]';

const RUNNING_TEXT = '.nui-content, .nui-code, .nui-prose, .nui-chart, [contenteditable], svg';

const SETTLE_MS = 1200;

const TOLERANCE = 0.02;

const offGrid = (value: number): boolean => Math.abs(value - Math.round(value)) > TOLERANCE;

const boxFaults = (box: KitBox): string[] => [
  ...(offGrid(box.height) ? [`height ${box.height.toFixed(2)}`] : []),
  ...(offGrid(box.dy) ? [`top ${box.dy.toFixed(2)}`] : []),
  ...(box.icon && offGrid(box.width) ? [`width ${box.width.toFixed(2)}`] : []),
  ...(box.icon && offGrid(box.dx) ? [`start ${box.dx.toFixed(2)}`] : []),
  ...(box.icon && !offGrid(box.width) && Math.round(box.width) % 2 === 1 ? ['odd size'] : []),
];

const lineFaults = (line: KitLine): string[] => [
  ...(offGrid(line.height) ? [`line ${line.height.toFixed(2)}`] : []),
  ...(offGrid(line.top) ? [`text top ${line.top.toFixed(2)}`] : []),
];

export const offPixel = (pixels: KitPixels): string[] => {
  const found = [
    ...pixels.boxes.map((box) => ({ name: box.name, faults: boxFaults(box) })),
    ...pixels.lines.map((line) => ({ name: line.name, faults: lineFaults(line) })),
  ].reduce((seen, item) => {
    if (item.faults.length > 0) {
      seen.add(`${item.name}: ${item.faults.join(', ')}`);
    }
    return seen;
  }, new Set<string>());

  return [...found].toSorted();
};

export const kitPixelsOf = (scope: Locator): Promise<KitPixels> =>
  scope.evaluate(
    (root, { kit, running }) => {
      const boxes: KitBox[] = [];
      const lines: KitLine[] = [];

      root.querySelectorAll<HTMLElement>(kit).forEach((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        let outer = element.parentElement?.closest<HTMLElement>(kit) ?? null;

        while (outer !== null && outer.getBoundingClientRect().height === 0) {
          outer = outer.parentElement?.closest<HTMLElement>(kit) ?? null;
        }

        if (
          outer === null ||
          rect.width <= 1 ||
          rect.height <= 1 ||
          element.closest(running) !== null ||
          style.display === 'inline' ||
          style.display === 'contents' ||
          !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        ) {
          return;
        }

        const from = outer.getBoundingClientRect();

        const still = [style.scale, style.rotate, style.translate, style.transform].every(
          (value) => value === 'none',
        );

        boxes.push({
          name: `${outer.classList[0] ?? outer.tagName} > ${element.classList[0] ?? element.tagName}`,
          icon: element.classList.contains('nui-icon'),
          width: Number.parseFloat(style.width),
          height: Number.parseFloat(style.height),
          dx: still ? rect.left - from.left : 0,
          dy: still ? rect.top - from.top : 0,
        });
      });

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

      while (walker.nextNode() !== null) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        const holder = parent?.closest<HTMLElement>(kit) ?? null;
        const range = document.createRange();

        range.selectNodeContents(node);

        const rects = range.getClientRects();
        const first = rects[0];

        if (
          parent !== null &&
          holder !== null &&
          first !== undefined &&
          rects.length === 1 &&
          first.width > 0 &&
          holder.getBoundingClientRect().height > 0 &&
          parent.closest(running) === null &&
          parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        ) {
          lines.push({
            name: `${holder.classList[0] ?? holder.tagName} text`,
            height: Number.parseFloat(getComputedStyle(parent).lineHeight),
            top: first.top - holder.getBoundingClientRect().top,
          });
        }
      }

      return { boxes, lines };
    },
    { kit: KIT_BOXES, running: RUNNING_TEXT },
  );

export const motionSettled = (page: Page): Promise<void> =>
  page.evaluate(async (settle) => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    await Promise.race([
      Promise.allSettled(
        document.getAnimations().reduce<Promise<Animation>[]>((ending, item) => {
          if (Number.isFinite(item.effect?.getComputedTiming().endTime)) {
            ending.push(item.finished);
          }
          return ending;
        }, []),
      ),
      new Promise<void>((resolve) => {
        setTimeout(resolve, settle);
      }),
    ]);
  }, SETTLE_MS);

export const showLayer = (layer: Locator): Promise<boolean> =>
  layer.evaluate(async (element, settle) => {
    try {
      if (element instanceof HTMLDialogElement) {
        element.showModal();
      } else if (element instanceof HTMLElement) {
        element.showPopover();
      }
    } catch {
      return false;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    await Promise.race([
      Promise.allSettled(element.getAnimations({ subtree: true }).map((item) => item.finished)),
      new Promise<void>((resolve) => {
        setTimeout(resolve, settle);
      }),
    ]);

    return element.getBoundingClientRect().height > 0;
  }, SETTLE_MS);

export const hideLayer = (layer: Locator): Promise<void> =>
  layer.evaluate((element) => {
    if (element instanceof HTMLDialogElement) {
      element.close();
    } else if (element instanceof HTMLElement) {
      element.hidePopover();
    }
  });
