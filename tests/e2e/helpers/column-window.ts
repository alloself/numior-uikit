import type { Locator } from '@playwright/test';

export interface ColumnCover {
  readonly head: number;
  readonly body: number;
}

const SKIPPED = '.nui-table__cell--gap, .nui-table__cell--pin-start, .nui-table__cell--pin-end';

export const coverAfterJump = (viewport: Locator, offset: number): Promise<ColumnCover> =>
  viewport.evaluate(
    (element, [target, skipped]) => {
      element.scrollLeft = target;

      const box = element.getBoundingClientRect();
      const start = box.left + element.clientLeft;
      const end = start + element.clientWidth;
      const top = box.top + element.clientTop;
      const bottom = top + element.clientHeight;

      const coverOf = (row: Element | undefined): number => {
        const cells = row === undefined ? [] : Array.from(row.children);

        const from = cells.reduce((edge, cell) => {
          const rect = cell.getBoundingClientRect();
          return cell.matches('.nui-table__cell--pin-start') ? Math.max(edge, rect.right) : edge;
        }, start);

        const to = cells.reduce((edge, cell) => {
          const rect = cell.getBoundingClientRect();
          return cell.matches('.nui-table__cell--pin-end') ? Math.min(edge, rect.left) : edge;
        }, end);

        const spans = cells
          .reduce<[number, number][]>((found, cell) => {
            const rect = cell.getBoundingClientRect();
            const span: [number, number] = [Math.max(rect.left, from), Math.min(rect.right, to)];

            if (cell.matches(skipped) || span[1] <= span[0]) {
              return found;
            }
            found.push(span);
            return found;
          }, [])
          .toSorted((one, two) => one[0] - two[0]);

        const covered = spans.reduce(
          (sum, [left, right]) => ({
            reach: Math.max(sum.reach, right),
            size: sum.size + Math.max(0, right - Math.max(left, sum.reach)),
          }),
          { reach: from, size: 0 },
        );

        return to > from ? covered.size / (to - from) : 0;
      };

      const head = element.querySelector(
        ':scope > .nui-table__lane > .nui-table__grid > .nui-table__header > tr:last-child',
      );

      const headBottom = head?.getBoundingClientRect().bottom ?? top;

      const body = Array.from(
        element.querySelectorAll(
          ':scope > .nui-table__lane > .nui-table__grid > .nui-table__body > .nui-table__row',
        ),
      ).find((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= headBottom && rect.bottom <= bottom;
      });

      return { head: coverOf(head ?? undefined), body: coverOf(body) };
    },
    [offset, SKIPPED] as const,
  );
