import type { Locator, Page } from '@playwright/test';
import { probeOn, type Probe } from './layers';

export interface KitButton {
  readonly name: string;
  readonly iconOnly: boolean;
  readonly width: number;
  readonly height: number;
}

export interface ButtonProbe {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly icons: number;
  readonly text: string;
  readonly control: boolean;
  readonly running: boolean;
  readonly visible: boolean;
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

const measurable = (probe: ButtonProbe, iconOnly: boolean): boolean => {
  const sized =
    Number.isFinite(probe.width) &&
    Number.isFinite(probe.height) &&
    probe.width > 1 &&
    probe.height > 1;

  return sized && (iconOnly || probe.control) && !probe.running && probe.visible;
};

export const kitButtonsProbe = (page: Page): Promise<Probe<ButtonProbe[]>> =>
  page.evaluateHandle(
    ({ buttons, controls, running }) =>
      (root: Element): ButtonProbe[] =>
        [...root.querySelectorAll<HTMLElement>(buttons)].map((element) => {
          const style = getComputedStyle(element);
          const holder = element.parentElement?.closest<HTMLElement>('[class*="nui-"]');
          const own = [...element.classList].filter((name) => name.startsWith('nui-')).join('.');

          const icons = [...element.querySelectorAll('svg')].filter((icon) =>
            icon.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
          );

          return {
            name: `${holder?.classList[0] ?? 'page'} > ${own}`,
            width: Number.parseFloat(style.width),
            height: Number.parseFloat(style.height),
            icons: icons.length,
            text: element.innerText.trim(),
            control: element.matches(controls),
            running: element.closest(running) !== null,
            visible: element.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
          };
        }),
    { buttons: KIT_BUTTONS, controls: CONTROLS, running: RUNNING_TEXT },
  );

export const toKitButtons = (probes: readonly ButtonProbe[]): KitButton[] =>
  probes.reduce<KitButton[]>((found, probe) => {
    const iconOnly = probe.icons === 1 && probe.text === '';

    if (!measurable(probe, iconOnly)) {
      return found;
    }

    found.push({ name: probe.name, iconOnly, width: probe.width, height: probe.height });

    return found;
  }, []);

export const kitButtonsOf = async (scope: Locator): Promise<KitButton[]> =>
  toKitButtons(await probeOn(scope, await kitButtonsProbe(scope.page())));
