import { sectionScope } from '../e2e/helpers/axe';
import { startedClosing } from '../e2e/helpers/motion';
import { expect, test } from './fixtures';
import { takesStillStates } from './profiles';

const SECTIONS = [
  'settings',
  'buttons',
  'typography',
  'chrome',
  'forms',
  'signup',
  'otp',
  'smart',
  'wizard',
  'overlays',
  'feedback',
  'navigation',
  'pickers',
  'intl',
  'dates',
  'upload',
  'layout',
  'data',
  'tree',
  'charts',
  'table',
  'table-detail',
  'table-sheet',
  'book',
  'table-cells',
  'table-flow',
  'formulas',
  'editor',
  'tokens',
  'nested',
];

test.beforeEach(async ({ playground, scenes }) => {
  const { direction, density, accent } = scenes.profile;

  await playground.open();
  await playground.setDirection(direction);
  await playground.setDensity(density);

  if (accent !== null) {
    await playground.setAccent(accent);
  }

  await scenes.finishTimers();
});

test('every section at rest', async ({ scenes }) => {
  test.skip(!scenes.profile.stills);

  for (const section of SECTIONS) {
    await scenes.captureSection(section);
  }
});

test('button states', async ({ buttons, scenes, page }) => {
  test.skip(!takesStillStates(scenes.profile));
  await buttons.primary.press('Shift');
  await scenes.captureSection('buttons', 'buttons--focus');
  await buttons.primary.hover();
  await scenes.captureSection('buttons', 'buttons--hover');
  await page.mouse.down();
  await scenes.captureSection('buttons', 'buttons--pressed');
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await buttons.loadingToggle.check();
  await scenes.captureSection('buttons', 'buttons--loading');
});

test('field states', async ({ forms, scenes }) => {
  test.skip(!takesStillStates(scenes.profile));
  await forms.nameInput.press('Shift');
  await scenes.captureSection('forms', 'forms--focus');
  await forms.nameInput.hover();
  await scenes.captureSection('forms', 'forms--hover');
  await forms.submit.click();
  await scenes.captureSection('forms', 'forms--submitted');
});

test('dialog states and motion', async ({ overlays, scenes }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('overlays');

  await scenes.motion(
    'overlays--dialog-enter',
    scope,
    async () => {
      await overlays.dialogOpen.click();
      await expect(overlays.dialog).toBeVisible();
    },
    overlays.dialogOpen,
  );

  await scenes.capture('overlays--dialog', scope, 'viewport');
  await scenes.motion('overlays--dialog-leave', scope, () => overlays.pressEscape());
  await expect(overlays.dialog).toBeHidden();

  await overlays.persistentOpen.click();
  await expect(overlays.persistentDialog).toBeVisible();

  await scenes.capture('overlays--persistent-dialog', scope, 'viewport');
  await overlays.persistentClose.click();
  await expect(overlays.persistentDialog).toBeHidden();

  await overlays.longDialogOpen.click();
  await expect(overlays.longDialog).toBeVisible();

  await scenes.capture('overlays--long-dialog', scope, 'viewport');
  await overlays.longDialogAccept.click();
  await expect(overlays.longDialog).toBeHidden();

  await scenes.motion(
    'nested--dialog-enter',
    sectionScope('nested'),
    async () => {
      await overlays.nestedDialogOpen.click();
      await expect(overlays.nestedDialog).toBeVisible();
    },
    overlays.nestedDialogOpen,
  );

  await scenes.capture('nested--dialog', sectionScope('nested'), 'viewport');
});

for (const side of ['start', 'end', 'top', 'bottom'] as const) {
  test(`drawer from the ${side} side`, async ({ overlays, scenes }) => {
    test.skip(!scenes.profile.states);
    const scope = sectionScope('overlays');

    await overlays.setDrawerSide(side);

    await scenes.motion(
      `overlays--drawer-${side}-enter`,
      scope,
      async () => {
        await overlays.drawerOpen.click();
        await expect(overlays.drawer).toBeVisible();
      },
      overlays.drawerOpen,
    );

    await scenes.capture(`overlays--drawer-${side}`, scope, 'viewport');
    await scenes.motion(`overlays--drawer-${side}-leave`, scope, () => overlays.pressEscape());
    await expect(overlays.drawer).toBeHidden();
  });
}

test('popover and tooltip states and motion', async ({ overlays, scenes, page }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('overlays');

  await scenes.motion(
    'overlays--popover-enter',
    scope,
    async () => {
      await overlays.popoverTrigger.click();
      await expect(overlays.popover).toBeVisible();
    },
    overlays.popoverTrigger,
  );

  await scenes.capture('overlays--popover', scope, 'viewport');
  await scenes.motion('overlays--popover-leave', scope, () => overlays.pressEscape());
  await expect(overlays.popover).toBeHidden();

  await scenes.motion('overlays--tooltip-enter', scope, async () => {
    await overlays.tooltipTrigger.hover();
    await expect(overlays.tooltip).toBeVisible();
  });

  await scenes.capture('overlays--tooltip', scope, 'viewport');

  await scenes.motion('overlays--tooltip-leave', scope, async () => {
    await page.mouse.move(0, 0);
    await startedClosing(overlays.tooltip);
  });

  await expect(overlays.tooltip).toBeHidden();
});

test('menu states and motion', async ({ navigation, overlays, scenes }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('navigation');

  await scenes.motion(
    'navigation--menu-enter',
    scope,
    async () => {
      await navigation.menuTrigger.click();
      await expect(navigation.menu).toBeVisible();
    },
    navigation.menuTrigger,
  );

  await scenes.capture('navigation--menu', scope, 'viewport');
  await scenes.motion('navigation--menu-leave', scope, () => overlays.pressEscape());
  await expect(navigation.menu).toBeHidden();
});

test('picker states and motion', async ({ pickers, dates, overlays, scenes }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('pickers');

  await scenes.motion(
    'pickers--select-enter',
    scope,
    async () => {
      await pickers.countryTrigger.click();
      await expect(pickers.option('Австрия')).toBeVisible();
    },
    pickers.countryTrigger,
  );

  await scenes.capture('pickers--select', scope, 'viewport');
  await scenes.motion('pickers--select-leave', scope, () => overlays.pressEscape());
  await expect(pickers.option('Австрия')).toBeHidden();

  await pickers.tagsTrigger.click();
  await scenes.capture('pickers--multiselect', scope, 'viewport');
  await overlays.pressEscape();

  await scenes.motion(
    'pickers--combobox-enter',
    scope,
    () => pickers.cityInput.click(),
    pickers.cityInput,
  );

  await scenes.capture('pickers--combobox', scope, 'viewport');
  await scenes.motion('pickers--combobox-leave', scope, () => overlays.pressEscape());

  await scenes.motion(
    'dates--picker-enter',
    sectionScope('dates'),
    async () => {
      await dates.openButton(dates.picker).click();
      await expect(dates.dialog(dates.picker)).toBeVisible();
    },
    dates.openButton(dates.picker),
  );

  await scenes.capture('dates--picker', sectionScope('dates'), 'viewport');
  await scenes.motion('dates--picker-leave', sectionScope('dates'), () => overlays.pressEscape());
});

test('command palette states and motion', async ({ chrome, overlays, scenes }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('chrome');

  await scenes.motion(
    'chrome--command-enter',
    scope,
    async () => {
      await chrome.commandOpen.click();
      await expect(chrome.commandDialog).toBeVisible();
    },
    chrome.commandOpen,
  );

  await scenes.capture('chrome--command', scope, 'viewport');
  await scenes.motion('chrome--command-leave', scope, () => overlays.pressEscape());
});

test('toast states and motion', async ({ feedback, scenes }) => {
  test.skip(!scenes.profile.states);
  const scope = sectionScope('feedback');

  await scenes.holdTimers();

  await scenes.motion(
    'feedback--toast-enter',
    scope,
    async () => {
      await feedback.toastShow.click();
      await expect(feedback.stackItems.first()).toBeVisible();
    },
    feedback.toastShow,
  );

  await scenes.capture('feedback--toast', scope, 'viewport');

  const close = feedback.closeButtonOf(feedback.stackItems.first());

  await scenes.motion('feedback--toast-leave', scope, () => close.click(), close);
  await scenes.releaseTimers();
});

test('table cell editors', async ({ table, tableCells, scenes, page }) => {
  test.skip(!takesStillStates(scenes.profile));

  await table.root.scrollIntoViewIfNeeded();
  await table.cell(1, 3).click();
  await page.keyboard.press('Enter');
  await expect(table.editorField()).toBeFocused();

  await scenes.capture('table--text-editor', sectionScope('table'), 'viewport');
  await page.keyboard.press('Escape');
  await table.cell(2, 5).click();
  await page.keyboard.press('F2');
  await table.editorField().fill('-5');
  await page.keyboard.press('Enter');
  await expect(table.editorError()).toBeVisible();

  await scenes.capture('table--invalid-editor', sectionScope('table'), 'viewport');
  await page.keyboard.press('Escape');
  await tableCells.show();
  await tableCells.cell(1, 1).click();
  await page.keyboard.type('42');
  await expect(tableCells.editor(1, 1)).toHaveValue('42');

  await scenes.capture('table-cells--editor', sectionScope('table-cells'), 'viewport');
});
