import type { Locator, Page } from '@playwright/test';
import { probeOn, type Probe } from './layers';

const ROWS =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="treeitem"], .nui-list-item';

const NESTED = '.nui-sidebar-sub__list, .nui-sidebar--rail';

const TOLERANCE = 0.5;

export const PANEL_INSET = '--spacing-layout-panel-inset';

export const LAYER_INSET = '--spacing-layout-layer-inset';

export const rowInsetProbe = (page: Page, token: string): Promise<Probe<string[]>> =>
  page.evaluateHandle(
    ({ rows, nested, inset, tolerance }) =>
      (root: Element): string[] => {
        const probe = document.createElement('div');

        probe.style.paddingInlineStart = `var(${inset})`;
        root.append(probe);

        const expected = Number.parseFloat(getComputedStyle(probe).paddingInlineStart);

        probe.remove();

        const frame = root.getBoundingClientRect();
        const start = frame.left + Number.parseFloat(getComputedStyle(root).borderLeftWidth);
        const surface = [...root.classList].join('.') || root.tagName.toLowerCase();

        return [...root.querySelectorAll<HTMLElement>(rows)].reduce<string[]>((found, row) => {
          const box = row.getBoundingClientRect();

          const measured =
            box.width > 0 &&
            row.parentElement?.closest(rows) === null &&
            row.closest(nested) === null &&
            row.checkVisibility({ opacityProperty: true, visibilityProperty: true });

          if (!measured) {
            return found;
          }

          const offset = box.left - start;

          if (Math.abs(offset - expected) <= tolerance) {
            return found;
          }

          found.push(
            `${surface} ${row.classList[0] ?? row.getAttribute('role') ?? ''}: ${offset.toFixed(1)} instead of ${expected}`,
          );

          return found;
        }, []);
      },
    { rows: ROWS, nested: NESTED, inset: token, tolerance: TOLERANCE },
  );

export const rowInsetFaultsOf = async (scope: Locator, token: string): Promise<string[]> =>
  probeOn(scope, await rowInsetProbe(scope.page(), token));
