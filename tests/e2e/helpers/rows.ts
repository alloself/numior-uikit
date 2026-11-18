import type { Locator } from '@playwright/test';

export interface RowPaint {
  readonly text: string;
  readonly icon: string;
}

export const ROWS =
  '.nui-list-item__action, .nui-list-item--mode-option, .nui-list-item--mode-treeitem, .nui-menu-item';

const STATED =
  '.nui-list-item--current, .nui-list-item--selected, .nui-sidebar-sub--active, [aria-selected="true"], [aria-current="page"], [aria-checked="true"]';

const DISABLED = '.nui-list-item--disabled, [aria-disabled="true"], :disabled';

const PLAIN_PER_LIST = 3;

const MOVING = ['background-color', 'color'];

export const paintOfRow = (row: Locator): Promise<RowPaint> =>
  row.evaluate((element) => {
    for (const running of document.getAnimations()) {
      if (!(running instanceof CSSTransition)) {
        continue;
      }

      running.finish();
    }

    const text = element.querySelector('.nui-row__title') ?? element;
    const icon = element.querySelector('.nui-row__leading');

    return {
      text: getComputedStyle(text).color,
      icon: icon === null ? '' : getComputedStyle(icon).color,
    };
  });

export const rowNameOf = (row: Locator): Promise<string> =>
  row.evaluate((element) => {
    const holder = element.closest('.nui-sidebar, .nui-tree, .nui-list, .nui-menu');
    const label = (element.textContent ?? '').trim().slice(0, 24);

    return `${holder?.classList[0] ?? 'page'} «${label}»`;
  });

export const rowsToHoverOf = (scope: Locator): Promise<number[]> =>
  scope.evaluate(
    (root, { rows, stated, disabled, plain }) => {
      const plainSeen = new Map<Element, number>();

      return [...root.querySelectorAll<HTMLElement>(rows)].reduce<number[]>(
        (picked, row, index) => {
          const shown =
            row.getBoundingClientRect().width > 0 &&
            row.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
            row.closest(disabled) === null;

          if (!shown) {
            return picked;
          }

          const holder = row.closest('.nui-list, .nui-menu') ?? root;
          const seen = plainSeen.get(holder) ?? 0;

          const withState =
            row.matches(stated) || row.closest('.nui-list-item')?.matches(stated) === true;

          if (withState) {
            picked.push(index);
            return picked;
          }

          if (seen >= plain) {
            return picked;
          }
          plainSeen.set(holder, seen + 1);
          picked.push(index);
          return picked;
        },
        [],
      );
    },
    { rows: ROWS, stated: STATED, disabled: DISABLED, plain: PLAIN_PER_LIST },
  );

export const rowTransitionFaultsOf = (scope: Locator): Promise<string[]> =>
  scope.evaluate(
    (root, { rows, moving }) => {
      const found = new Set<string>();

      for (const row of root.querySelectorAll(rows)) {
        const item = row.closest('.nui-list-item');
        const holders = item === null || item === row ? [row] : [item, row];
        const rowParts = [...row.querySelectorAll('.nui-row__leading, .nui-row__description')];
        const timings: string[] = [];

        for (const part of [...holders, ...rowParts]) {
          const style = getComputedStyle(part);

          const [properties = [], durations = [], easings = []] = [
            style.transitionProperty,
            style.transitionDuration,
            style.transitionTimingFunction,
          ].map((value) => value.split(/,(?![^(]*\))/u).map((piece) => piece.trim()));

          const watched = rowParts.includes(part) ? ['color'] : moving;

          for (const property of watched) {
            const exact = properties.indexOf(property);
            const index = exact === -1 ? properties.indexOf('all') : exact;
            const duration = index === -1 ? '0s' : (durations[index % durations.length] ?? '0s');
            const easing = index === -1 ? '' : (easings[index % easings.length] ?? '');
            const timing = duration === '0s' ? 'none' : `${duration} ${easing}`;

            timings.push(`${part.classList[0] ?? ''} ${property} ${timing}`);
          }
        }

        const kinds = new Set(timings.map((timing) => timing.split(' ').slice(2).join(' ')));

        if (kinds.size === 1) {
          continue;
        }

        const holder = row.closest('.nui-sidebar, .nui-tree, .nui-list, .nui-menu');

        found.add(`${holder?.classList[0] ?? 'page'}: ${timings.join(', ')}`);
      }

      return [...found].toSorted();
    },
    { rows: ROWS, moving: MOVING },
  );
