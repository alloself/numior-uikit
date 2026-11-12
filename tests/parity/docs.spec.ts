import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startedClosing } from '../e2e/helpers/motion';
import { expect, test } from './fixtures';
import { takesStillStates } from './profiles';

const DOCS = new URL('../../apps/docs/', import.meta.url);
const PHONE_WIDTH = 600;

const routesIn = (folder: string): string[] =>
  readdirSync(fileURLToPath(new URL(folder, DOCS))).reduce<string[]>((routes, file) => {
    if (file.endsWith('.md')) {
      routes.push(`/${folder}/${file.slice(0, -3)}`);
    }
    return routes;
  }, []);

const ROUTES = ['/', ...['guide', 'components', 'composables', 'theme'].flatMap(routesIn)];
const OPENED_BY_BUTTON = ['dialog', 'drawer', 'menu', 'popover', 'date-picker'];
const TIMED = ['toast'];
const OPENED_BY_COMBOBOX = ['select', 'combobox'];

const POPOVER_SIDES = ['Сверху', 'Справа', 'Снизу у края', 'Слева'];
const TOOLTIP_TRIGGERS = ['Сохранить', 'Опубликовать'];

const sceneOf = (route: string): string => (route === '/' ? 'home' : route.slice(1));

test.beforeEach(async ({ page, scenes }) => {
  await page.addInitScript(
    ([scheme, accent]) => {
      localStorage.setItem('nui-theme', scheme);

      if (accent === null) {
        return;
      }

      localStorage.setItem('nui-accent', accent);
    },
    [scenes.profile.scheme, scenes.profile.accent] as const,
  );
});

for (const route of ROUTES) {
  test(`page ${route}`, async ({ docs, scenes }) => {
    test.skip(!scenes.profile.stills);
    await docs.open(route);
    await scenes.reveal();
    await scenes.finishTimers();
    await scenes.showCurrentLinks();
    await scenes.capture(sceneOf(route), 'html', 'page');
  });
}

test('example frame options', async ({ docs, scenes }) => {
  test.skip(!takesStillStates(scenes.profile) || scenes.profile.width < PHONE_WIDTH);
  await docs.open('/components/button');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  const example = docs.example();

  await example.invertTheme.click();
  await scenes.capture('states/example--inverted', 'html', 'viewport');
  await example.rtl.click();
  await scenes.capture('states/example--inverted-rtl', 'html', 'viewport');
  await example.baseTheme.click();
  await scenes.capture('states/example--base-inverted-rtl', 'html', 'viewport');
  await example.invertTheme.click();
  await scenes.capture('states/example--base-rtl', 'html', 'viewport');
  await example.codeToggle.click();
  await expect(example.code).toBeVisible();

  await scenes.capture('states/example--code', 'html', 'viewport');
});

test('configurator options', async ({ docs, scenes }) => {
  test.skip(!takesStillStates(scenes.profile) || scenes.profile.width < PHONE_WIDTH);
  await docs.open('/components/button');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  const configurator = docs.configurator();

  await configurator.choose('variant', 'soft');
  await configurator.panel.scrollIntoViewIfNeeded();
  await scenes.capture('states/configurator--soft', 'html', 'viewport');
  await configurator.enable('disabled');
  await scenes.capture('states/configurator--soft-disabled', 'html', 'viewport');
});

test('shell surfaces', async ({ docs, scenes, page }) => {
  test.skip(!takesStillStates(scenes.profile));
  await docs.open('/components/input');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  await docs.themeButton.click();
  await scenes.capture('states/shell--theme-menu', 'html', 'viewport');
  await page.keyboard.press('Escape');
  await docs.searchButton.click();
  await expect(docs.commandDialog).toBeVisible();

  await docs.commandInput.fill('Диалог');
  await expect(docs.commandOptions.first()).toBeVisible();

  await scenes.capture('states/shell--search', 'html', 'viewport');
});

test('shell drawer', async ({ docs, scenes }) => {
  test.skip(!takesStillStates(scenes.profile) || scenes.profile.width >= PHONE_WIDTH);
  await docs.open('/components/input');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  await docs.trigger.click();
  await expect(docs.drawer).toBeVisible();

  await scenes.showCurrentLinks();

  await scenes.capture('states/shell--drawer', 'html', 'viewport');
});

test('missing page', async ({ docs, scenes }) => {
  test.skip(!takesStillStates(scenes.profile));
  await docs.open('/components/absent');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  await scenes.capture('states/shell--not-found', 'html', 'viewport');
});

for (const name of OPENED_BY_BUTTON) {
  test(`opened ${name} example`, async ({ docs, scenes }) => {
    test.skip(!takesStillStates(scenes.profile));
    await docs.open(`/components/${name}`);
    await scenes.finishTimers();
    await scenes.showCurrentLinks();
    await docs.example().preview.getByRole('button').first().click();
    await scenes.capture(`states/${name}--open`, 'html', 'viewport');
  });
}

for (const name of OPENED_BY_COMBOBOX) {
  test(`opened ${name} example`, async ({ docs, scenes }) => {
    test.skip(!takesStillStates(scenes.profile));
    await docs.open(`/components/${name}`);
    await scenes.finishTimers();
    await scenes.showCurrentLinks();
    await docs.example().preview.getByRole('combobox').first().click();
    await scenes.capture(`states/${name}--open`, 'html', 'viewport');
  });
}

test('focused and hovered input example', async ({ docs, scenes }) => {
  test.skip(!takesStillStates(scenes.profile));
  await docs.open('/components/input');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  const field = docs.example().preview.getByRole('textbox').first();

  await field.press('Shift');
  await scenes.capture('states/input--focus', 'html', 'viewport');
  await docs.heading.click();
  await field.hover();
  await scenes.capture('states/input--hover', 'html', 'viewport');
});

test('popover motion on every side', async ({ docs, scenes, page }) => {
  test.skip(!scenes.profile.states);
  await docs.open('/components/popover');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();

  for (const [index, side] of POPOVER_SIDES.entries()) {
    const trigger = docs.article.getByRole('button', { name: side, exact: true });

    await trigger.scrollIntoViewIfNeeded();

    await scenes.motion(
      `states/popover-side-${index}-enter`,
      'html',
      () => trigger.click(),
      trigger,
    );

    await scenes.capture(`states/popover-side-${index}`, 'html', 'viewport');

    await scenes.motion(`states/popover-side-${index}-leave`, 'html', () =>
      page.keyboard.press('Escape'),
    );
  }
});

test('tooltip motion above and below', async ({ docs, scenes, page }) => {
  test.skip(!scenes.profile.states);
  await docs.open('/components/tooltip');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();

  for (const [index, name] of TOOLTIP_TRIGGERS.entries()) {
    const trigger = docs.example().preview.getByRole('button', { name, exact: true });

    await scenes.motion(`states/tooltip-${index}-enter`, 'html', async () => {
      await trigger.hover();
      await expect(docs.tooltip).toBeVisible();
    });

    await scenes.capture(`states/tooltip-${index}`, 'html', 'viewport');

    await scenes.motion(`states/tooltip-${index}-leave`, 'html', async () => {
      await page.mouse.move(0, 0);
      await startedClosing(docs.tooltip);
    });
  }
});

for (const name of ['dialog', 'drawer', 'menu', 'toast']) {
  test(`${name} motion in the first example`, async ({ docs, scenes }) => {
    test.skip(!scenes.profile.states);
    await docs.open(`/components/${name}`);
    await scenes.finishTimers();
    await scenes.showCurrentLinks();
    const trigger = docs.example().preview.getByRole('button').first();

    if (TIMED.includes(name)) {
      await scenes.holdTimers();
    }

    await scenes.motion(`states/${name}-enter`, 'html', () => trigger.click(), trigger);
  });
}

test('select list motion', async ({ docs, scenes, page }) => {
  test.skip(!scenes.profile.states);
  await docs.open('/components/select');
  await scenes.finishTimers();
  await scenes.showCurrentLinks();
  const trigger = docs.example().preview.getByRole('combobox').first();

  await scenes.motion('states/select-enter', 'html', () => trigger.click(), trigger);
  await scenes.motion('states/select-leave', 'html', () => page.keyboard.press('Escape'));
});
