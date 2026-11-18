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

const THEME_SCOPES = '[class*="nui-theme--"]';

const KIT_BOXES = `[class*="nui-"]:not(${THEME_SCOPES})`;

const RUNNING_TEXT = '.nui-content, .nui-code, .nui-prose, .nui-chart, [contenteditable], svg';

const SETTLE_MS = 1200;

const OPEN_FRAMES = 3;

const CLOSE_FRAMES = 2;

const TOLERANCE = 0.02;

const offGrid = (value: number): boolean => Math.abs(value - Math.round(value)) > TOLERANCE;

const placeFaults = (box: KitBox): string[] => [
  ...(offGrid(box.height) ? [`height ${box.height.toFixed(2)}`] : []),
  ...(offGrid(box.dy) ? [`top ${box.dy.toFixed(2)}`] : []),
];

const iconFaults = (box: KitBox): string[] => {
  if (!box.icon) {
    return [];
  }
  return [
    ...(offGrid(box.width) ? [`width ${box.width.toFixed(2)}`] : []),
    ...(offGrid(box.dx) ? [`start ${box.dx.toFixed(2)}`] : []),
    ...(!offGrid(box.width) && Math.round(box.width) % 2 === 1 ? ['odd size'] : []),
  ];
};

const boxFaults = (box: KitBox): string[] => [...placeFaults(box), ...iconFaults(box)];

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

const kitBoxesOf = (scope: Locator): Promise<KitBox[]> =>
  scope.evaluate(
    (root, { kit, running }) => {
      const boxes: KitBox[] = [];

      const holderOf = (element: HTMLElement): HTMLElement | null => {
        let outer = element.parentElement?.closest<HTMLElement>(kit) ?? null;

        while (outer !== null && outer.getBoundingClientRect().height === 0) {
          outer = outer.parentElement?.closest<HTMLElement>(kit) ?? null;
        }
        return outer;
      };

      const measurable = (element: HTMLElement, style: CSSStyleDeclaration): boolean => {
        const rect = element.getBoundingClientRect();

        return (
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== 'inline' &&
          style.display !== 'contents' &&
          element.closest(running) === null &&
          element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        );
      };

      const boxOf = (element: HTMLElement): KitBox | undefined => {
        const style = getComputedStyle(element);
        const outer = holderOf(element);

        if (outer === null || !measurable(element, style)) {
          return undefined;
        }

        const rect = element.getBoundingClientRect();
        const from = outer.getBoundingClientRect();

        const still = [style.scale, style.rotate, style.translate, style.transform].every(
          (value) => value === 'none',
        );

        return {
          name: `${outer.classList[0] ?? outer.tagName} > ${element.classList[0] ?? element.tagName}`,
          icon: element.classList.contains('nui-icon'),
          width: Number.parseFloat(style.width),
          height: Number.parseFloat(style.height),
          dx: still ? rect.left - from.left : 0,
          dy: still ? rect.top - from.top : 0,
        };
      };

      root.querySelectorAll<HTMLElement>(kit).forEach((element) => {
        const box = boxOf(element);

        if (box === undefined) {
          return;
        }

        boxes.push(box);
      });

      return boxes;
    },
    { kit: KIT_BOXES, running: RUNNING_TEXT },
  );

const kitLinesOf = (scope: Locator): Promise<KitLine[]> =>
  scope.evaluate(
    (root, { kit, running }) => {
      const lines: KitLine[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

      const holderOf = (parent: HTMLElement): HTMLElement | undefined => {
        const holder = parent.closest<HTMLElement>(kit);

        if (
          holder === null ||
          holder.getBoundingClientRect().height <= 0 ||
          parent.closest(running) !== null
        ) {
          return undefined;
        }
        return parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })
          ? holder
          : undefined;
      };

      const lineOf = (node: Node): KitLine | undefined => {
        const parent = node.parentElement;
        const holder = parent === null ? undefined : holderOf(parent);
        const range = document.createRange();

        range.selectNodeContents(node);

        const rects = range.getClientRects();
        const first = rects[0];

        if (
          parent === null ||
          holder === undefined ||
          first === undefined ||
          rects.length !== 1 ||
          first.width <= 0
        ) {
          return undefined;
        }

        return {
          name: `${holder.classList[0] ?? holder.tagName} text`,
          height: Number.parseFloat(getComputedStyle(parent).lineHeight),
          top: first.top - holder.getBoundingClientRect().top,
        };
      };

      while (walker.nextNode() !== null) {
        const line = lineOf(walker.currentNode);

        if (line === undefined) {
          continue;
        }

        lines.push(line);
      }

      return lines;
    },
    { kit: KIT_BOXES, running: RUNNING_TEXT },
  );

export const kitPixelsOf = async (scope: Locator): Promise<KitPixels> => {
  const [boxes, lines] = await Promise.all([kitBoxesOf(scope), kitLinesOf(scope)]);

  return { boxes, lines };
};

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

const finishedHeightOf = (layer: Locator, frames: number): Promise<number> =>
  layer.evaluate(async (element, count) => {
    for (let frame = 0; frame < count; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

      for (const item of element.getAnimations({ subtree: true })) {
        if (!Number.isFinite(item.effect?.getComputedTiming().endTime)) {
          continue;
        }

        item.finish();
      }
    }

    return element.getBoundingClientRect().height;
  }, frames);

export const showLayer = async (layer: Locator): Promise<boolean> => {
  const opened = await layer.evaluate((element) => {
    try {
      if (element instanceof HTMLDialogElement) {
        element.showModal();
      } else if (element instanceof HTMLElement) {
        element.showPopover();
      }
    } catch {
      return false;
    }

    return true;
  });

  if (!opened) {
    return false;
  }

  return (await finishedHeightOf(layer, OPEN_FRAMES)) > 0;
};

export const hideLayer = async (layer: Locator): Promise<void> => {
  await layer.evaluate((element) => {
    if (element instanceof HTMLDialogElement) {
      element.close();
    } else if (element instanceof HTMLElement) {
      element.hidePopover();
    }
  });

  await finishedHeightOf(layer, CLOSE_FRAMES);
};
