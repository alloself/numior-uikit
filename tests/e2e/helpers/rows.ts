import type { Locator } from '@playwright/test';

interface PartTransition {
  readonly part: string;
  readonly colourOnly: boolean;
  readonly properties: string;
  readonly durations: string;
  readonly easings: string;
}

interface RowTransitions {
  readonly holder: string;
  readonly parts: readonly PartTransition[];
}

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

const LIST_SPLIT = /,(?![^(]*\))/u;

const listOf = (value: string): string[] => value.split(LIST_SPLIT).map((piece) => piece.trim());

const timingOf = (transition: PartTransition, property: string): string => {
  const properties = listOf(transition.properties);
  const durations = listOf(transition.durations);
  const easings = listOf(transition.easings);
  const exact = properties.indexOf(property);
  const index = exact === -1 ? properties.indexOf('all') : exact;

  if (index === -1) {
    return 'none';
  }

  const duration = durations[index % durations.length] ?? '0s';

  return duration === '0s' ? 'none' : `${duration} ${easings[index % easings.length] ?? ''}`;
};

const partTimings = (transition: PartTransition): string[] =>
  (transition.colourOnly ? ['color'] : MOVING).map(
    (property) => `${transition.part} ${property} ${timingOf(transition, property)}`,
  );

const faultOf = (row: RowTransitions): string | undefined => {
  const timings = row.parts.flatMap(partTimings);
  const kinds = new Set(timings.map((timing) => timing.split(' ').slice(2).join(' ')));

  return kinds.size === 1 ? undefined : `${row.holder}: ${timings.join(', ')}`;
};

const transitionsOf = (scope: Locator): Promise<RowTransitions[]> =>
  scope.evaluate(
    (root, { rows }) =>
      [...root.querySelectorAll(rows)].map((row) => {
        const item = row.closest('.nui-list-item');
        const holders = item === null || item === row ? [row] : [item, row];
        const rowParts = [...row.querySelectorAll('.nui-row__leading, .nui-row__description')];
        const holder = row.closest('.nui-sidebar, .nui-tree, .nui-list, .nui-menu');

        const parts = [
          ...holders.map((element) => ({ element, colourOnly: false })),
          ...rowParts.map((element) => ({ element, colourOnly: true })),
        ];

        return {
          holder: holder?.classList[0] ?? 'page',
          parts: parts.map(({ element, colourOnly }) => {
            const style = getComputedStyle(element);

            return {
              part: element.classList[0] ?? '',
              colourOnly,
              properties: style.transitionProperty,
              durations: style.transitionDuration,
              easings: style.transitionTimingFunction,
            };
          }),
        };
      }),
    { rows: ROWS },
  );

export const rowTransitionFaultsOf = async (scope: Locator): Promise<string[]> => {
  const faults = (await transitionsOf(scope)).reduce((found, row) => {
    const fault = faultOf(row);

    if (fault !== undefined) {
      found.add(fault);
    }
    return found;
  }, new Set<string>());

  return [...faults].toSorted();
};
