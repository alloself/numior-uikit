import type { Locator } from '@playwright/test';

export interface KitButton {
  readonly name: string;
  readonly iconOnly: boolean;
  readonly width: number;
  readonly height: number;
}

const KIT_BUTTONS = 'button[class*="nui-"], a.nui-button, [role="button"][class*="nui-"]';

const CONTROLS = '.nui-button:not(.nui-button--variant-link)';

const RUNNING_TEXT = '.nui-content, [contenteditable]';

const STEP = 4;

const TOLERANCE = 0.02;

const offStep = (value: number): boolean =>
  Math.abs(value - Math.round(value / STEP) * STEP) > TOLERANCE;

const buttonFaults = (button: KitButton): string[] => {
  if (!button.iconOnly) {
    return offStep(button.height) ? ['height off the 4 px step'] : [];
  }
  return [
    ...(Math.abs(button.width - button.height) > TOLERANCE ? ['not square'] : []),
    ...(offStep(button.width) || offStep(button.height) ? ['off the 4 px step'] : []),
  ];
};

export const offGridButtons = (buttons: readonly KitButton[]): string[] => {
  const found = buttons.reduce((seen, button) => {
    const faults = buttonFaults(button);

    if (faults.length > 0) {
      seen.add(`${button.name} ${button.width}×${button.height}: ${faults.join(', ')}`);
    }
    return seen;
  }, new Set<string>());

  return [...found].toSorted();
};

export const kitButtonsOf = (scope: Locator): Promise<KitButton[]> =>
  scope.evaluate(
    (root, { buttons, controls, running }) =>
      [...root.querySelectorAll<HTMLElement>(buttons)].reduce<KitButton[]>((found, element) => {
        const style = getComputedStyle(element);
        const width = Number.parseFloat(style.width);
        const height = Number.parseFloat(style.height);

        const icons = [...element.querySelectorAll('svg')].filter((icon) =>
          icon.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        );

        const iconOnly = icons.length === 1 && element.innerText.trim() === '';

        const measurable =
          Number.isFinite(width) &&
          Number.isFinite(height) &&
          width > 1 &&
          height > 1 &&
          (iconOnly || element.matches(controls)) &&
          element.closest(running) === null &&
          element.checkVisibility({ opacityProperty: true, visibilityProperty: true });

        if (!measurable) {
          return found;
        }

        const holder = element.parentElement?.closest<HTMLElement>('[class*="nui-"]');
        const own = [...element.classList].filter((name) => name.startsWith('nui-')).join('.');

        found.push({
          name: `${holder?.classList[0] ?? 'page'} > ${own}`,
          iconOnly,
          width,
          height,
        });

        return found;
      }, []),
    { buttons: KIT_BUTTONS, controls: CONTROLS, running: RUNNING_TEXT },
  );
