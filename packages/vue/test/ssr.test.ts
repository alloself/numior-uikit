// @vitest-environment node
import { config, renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import {
  NuiAlert,
  NuiAvatar,
  NuiAvatarUpload,
  NuiAvatarGroup,
  NuiBadge,
  NuiBreadcrumbs,
  NuiButton,
  NuiCalendar,
  NuiCard,
  NuiCheckbox,
  NuiChip,
  NuiCollapsible,
  NuiCommand,
  NuiDatePicker,
  NuiDateRangePicker,
  NuiDialog,
  NuiDrawer,
  NuiEmpty,
  NuiIcon,
  NuiInput,
  NuiKbd,
  NuiCode,
  NuiLink,
  NuiList,
  NuiNumberField,
  NuiPagination,
  NuiProgress,
  NuiSelect,
  NuiSeparator,
  NuiSkeleton,
  NuiSkipLink,
  NuiSplitter,
  NuiStepper,
  NuiSwitch,
  NuiTabs,
  NuiTextarea,
  NuiTimeField,
  NuiToast,
  NuiToaster,
  NuiToc,
  NuiToggleGroup,
  NuiTree,
  NuiUpload,
} from '../src';
import AccordionScene from './fixtures/ssr/AccordionScene.vue';
import AvatarGroupScene from './fixtures/ssr/AvatarGroupScene.vue';
import CardScene from './fixtures/ssr/CardScene.vue';
import DisabledControlsForm from './fixtures/ssr/DisabledControlsForm.vue';
import FieldScene from './fixtures/ssr/FieldScene.vue';
import LayoutScene from './fixtures/ssr/LayoutScene.vue';
import MenuScene from './fixtures/ssr/MenuScene.vue';
import PopoverScene from './fixtures/ssr/PopoverScene.vue';
import SplitterScene from './fixtures/ssr/SplitterScene.vue';
import TabsScene from './fixtures/ssr/TabsScene.vue';
import TooltipScene from './fixtures/ssr/TooltipScene.vue';
import NestedConfig from './fixtures/NestedConfig.vue';
import { configPlugins } from './support/config';
import { RouterStub } from './support/router-stub';
import { labelTarget, popoverTarget } from './support/ssr';
import { FILES, manyNodes } from './support/tree-items';
import { CATEGORIES } from './support/options';
import { atInstant } from './support/clock';

interface Scenario {
  readonly name: string;
  render(): Promise<string>;
}

config.global.stubs = { transition: false, 'transition-group': false };

const STEPPER_STEPS = [
  { value: 'account', label: 'Account' },
  { value: 'profile', label: 'Profile', description: 'Name and photo' },
  { value: 'plan', label: 'Plan' },
];

const REPORT = {
  id: 'existing-1',
  name: 'report.pdf',
  size: 2048,
  type: 'application/pdf',
  status: 'done',
  url: 'https://cdn.example/report.pdf',
} as const;

const fieldWithInput = () => renderToString(FieldScene, { props: { scene: 'input' } });

const renderMenu = () => renderToString(MenuScene);

const renderTabs = () => renderToString(TabsScene);

const renderSelect = () => renderToString(FieldScene, { props: { scene: 'select' } });

const renderReadonlySelect = () =>
  renderToString(NuiSelect, {
    props: {
      modelValue: 'banana',
      readonly: true,
      options: [{ value: 'banana', label: 'Banana' }],
    },
  });

const renderCombobox = () => renderToString(FieldScene, { props: { scene: 'combobox' } });

const renderPopover = () => renderToString(PopoverScene);

const scenarios: Scenario[] = [
  {
    name: 'NuiButton',
    render: () =>
      renderToString(NuiButton, { props: { loading: true }, slots: { default: 'Save' } }),
  },
  {
    name: 'NuiButton as link',
    render: () =>
      renderToString(NuiButton, {
        props: { href: '/docs', variant: 'outline' },
        slots: { default: 'Docs' },
      }),
  },
  { name: 'NuiIcon', render: () => renderToString(NuiIcon, { props: { icon: 'check' } }) },
  { name: 'NuiSeparator', render: () => renderToString(NuiSeparator, { props: { label: 'or' } }) },
  { name: 'NuiKbd', render: () => renderToString(NuiKbd, { props: { keys: 'mod+k' } }) },
  {
    name: 'NuiSkipLink',
    render: () => renderToString(NuiSkipLink, { props: { target: 'main' } }),
  },
  { name: 'NuiSplitter', render: () => renderToString(SplitterScene) },
  {
    name: 'NuiToc',
    render: () =>
      renderToString(NuiToc, {
        props: {
          items: [
            { id: 'install', label: 'Install' },
            { id: 'usage', label: 'Usage', children: [{ id: 'basic', label: 'Basic' }] },
          ],
        },
      }),
  },
  {
    name: 'NuiCommand',
    render: () =>
      renderToString(NuiCommand, {
        props: {
          id: 'palette',
          items: [
            { label: 'Pages', items: [{ value: 'home', label: 'Home', shortcut: 'mod+h' }] },
            { value: 'theme', label: 'Toggle theme' },
          ],
        },
      }),
  },
  {
    name: 'NuiCollapsible',
    render: () =>
      renderToString(NuiCollapsible, {
        props: { label: 'Details', headingLevel: 3 },
        slots: { default: 'Hidden text' },
      }),
  },
  { name: 'NuiAccordion', render: () => renderToString(AccordionScene) },
  {
    name: 'NuiToggleGroup',
    render: () =>
      renderToString(NuiToggleGroup, {
        props: {
          modelValue: 'dark',
          label: 'Theme',
          variant: 'segmented',
          items: [
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
          ],
        },
      }),
  },
  {
    name: 'NuiCode',
    render: () =>
      renderToString(NuiCode, {
        props: {
          code: 'const a = 1;\nconst b = 2;\n',
          title: 'main.ts',
          lineNumbers: true,
          highlight: [2],
          tokens: [
            [
              { text: 'const', scope: 'keyword' },
              { text: ' a = ' },
              { text: '1', scope: 'number' },
            ],
            [
              { text: 'const', scope: 'keyword' },
              { text: ' b = ' },
              { text: '2', scope: 'number' },
            ],
          ],
        },
      }),
  },
  {
    name: 'NuiChip',
    render: () =>
      renderToString(NuiChip, {
        props: { tone: 'success', removable: true, removeLabel: 'Remove Vue' },
        slots: { default: 'Vue' },
      }),
  },
  {
    name: 'NuiBadge',
    render: () => renderToString(NuiBadge, { props: { count: 120, tone: 'error' } }),
  },
  {
    name: 'NuiEmpty',
    render: () =>
      renderToString(NuiEmpty, { props: { title: 'Nothing here', description: 'Add an item' } }),
  },
  {
    name: 'NuiList',
    render: () =>
      renderToString(NuiList, {
        props: {
          items: [
            { label: 'Docs', href: '/docs', description: 'Guides' },
            { label: 'Plain', icon: 'check' },
          ],
          variant: 'divided',
        },
      }),
  },
  {
    name: 'NuiList nav',
    render: () =>
      renderToString(NuiList, {
        props: {
          items: [
            { label: 'Inbox', href: '/inbox', icon: 'inbox', current: true, badge: 3 },
            { label: 'Drafts', href: '/drafts' },
          ],
          variant: 'nav',
        },
      }),
  },
  {
    name: 'NuiTree',
    render: () =>
      renderToString(NuiTree, {
        props: { id: 'files', items: FILES, expanded: ['src'], modelValue: 'index' },
      }),
  },
  { name: 'NuiCard', render: () => renderToString(CardScene, { props: { body: 'Body' } }) },
  {
    name: 'NuiAvatar',
    render: () =>
      renderToString(NuiAvatar, {
        props: { src: '/alice.png', name: 'Alice Brown', status: 'online' },
      }),
  },
  {
    name: 'NuiAvatarGroup',
    render: () =>
      renderToString(NuiAvatarGroup, {
        props: { items: [{ name: 'Alice Brown' }, { name: 'Bob Stone' }], max: 1 },
      }),
  },
  {
    name: 'NuiLink',
    render: () =>
      renderToString(NuiLink, {
        props: { href: 'https://example.com', external: true },
        slots: { default: 'Docs' },
      }),
  },
  {
    name: 'NuiStepper',
    render: () =>
      renderToString(NuiStepper, { props: { steps: STEPPER_STEPS, modelValue: 'profile' } }),
  },
  {
    name: 'NuiDialog in a Russian config',
    render: () =>
      renderToString(NuiDialog, {
        props: { title: 'Удалить?' },
        slots: { default: 'Текст' },
        global: { plugins: configPlugins({ locale: 'ru-RU' }) },
      }),
  },
  {
    name: 'provideNuiConfig scope',
    render: () =>
      renderToString(NestedConfig, {
        props: { inner: { locale: 'de-DE' }, content: 'number' },
      }),
  },
  { name: 'NuiField with NuiInput', render: fieldWithInput },
  {
    name: 'NuiField keeping room for an error',
    render: () => renderToString(FieldScene, { props: { scene: 'reserved-error' } }),
  },
  {
    name: 'NuiTextarea',
    render: () => renderToString(NuiTextarea, { props: { modelValue: 'text', invalid: true } }),
  },
  {
    name: 'NuiTimeField',
    render: () =>
      renderToString(NuiTimeField, {
        props: { modelValue: '13:05', locale: 'en-US', name: 'start' },
      }),
  },
  {
    name: 'NuiOtpField',
    render: () => renderToString(FieldScene, { props: { scene: 'otp' } }),
  },
  {
    name: 'NuiDatePicker',
    render: () =>
      renderToString(NuiDatePicker, {
        props: {
          modelValue: '2026-09-24',
          locale: 'ru-RU',
          name: 'trip',
          today: '2026-09-24',
        },
      }),
  },
  {
    name: 'NuiDateRangePicker',
    render: () =>
      renderToString(NuiDateRangePicker, {
        props: {
          modelValue: { start: '2026-09-21', end: '2026-09-27' },
          locale: 'en-US',
          startName: 'from',
          endName: 'to',
          today: '2026-09-24',
        },
      }),
  },
  {
    name: 'NuiUpload',
    render: () =>
      renderToString(NuiUpload<string>, {
        props: {
          upload: () => Promise.resolve('ok'),
          hint: 'PDF up to 1 MB',
          modelValue: [REPORT],
        },
      }),
  },
  { name: 'NuiLayout', render: () => renderToString(LayoutScene) },
  {
    name: 'NuiDatePicker with time',
    render: () =>
      renderToString(NuiDatePicker, {
        props: {
          modelValue: '2026-09-24T09:30',
          locale: 'ru-RU',
          time: true,
          today: '2026-09-24',
        },
      }),
  },
  {
    name: 'NuiCalendar',
    render: () =>
      renderToString(NuiCalendar, {
        props: {
          modelValue: { start: '2026-09-21', end: '2026-09-25' },
          mode: 'range',
          month: '2026-09',
          locale: 'ru-RU',
          today: '2026-09-24',
          weekNumbers: true,
          months: 2,
        },
      }),
  },
  {
    name: 'NuiNumberField',
    render: () =>
      renderToString(NuiNumberField, {
        props: {
          modelValue: 1234.5,
          locale: 'de-DE',
          formatOptions: { style: 'currency', currency: 'EUR' },
          name: 'price',
          min: 0,
        },
      }),
  },
  {
    name: 'NuiCheckbox',
    render: () =>
      renderToString(NuiCheckbox, {
        props: { modelValue: true, indeterminate: true },
        slots: { default: 'Terms' },
      }),
  },
  {
    name: 'NuiRadioGroup in a group field',
    render: () => renderToString(FieldScene, { props: { scene: 'radio-group' } }),
  },
  {
    name: 'NuiSwitch',
    render: () =>
      renderToString(NuiSwitch, { props: { modelValue: true }, slots: { default: 'Notify' } }),
  },
  {
    name: 'NuiDialog',
    render: () =>
      renderToString(NuiDialog, {
        props: { open: true, id: 'confirm', title: 'Delete?', description: 'Sure?' },
        slots: { default: 'Body' },
      }),
  },
  {
    name: 'NuiDrawer',
    render: () =>
      renderToString(NuiDrawer, {
        props: { open: true, side: 'start' },
        slots: { default: 'Body' },
      }),
  },
  { name: 'NuiPopover', render: renderPopover },
  { name: 'NuiMenu', render: renderMenu },
  { name: 'NuiTabs', render: renderTabs },
  { name: 'NuiSelect in a field', render: renderSelect },
  { name: 'NuiCombobox in a field', render: renderCombobox },
  {
    name: 'NuiPagination',
    render: () =>
      renderToString(NuiPagination, {
        props: { total: 60, page: 2, href: (page: number) => `#page-${page}` },
      }),
  },
  {
    name: 'NuiBreadcrumbs',
    render: () =>
      renderToString(NuiBreadcrumbs, {
        props: {
          items: [
            { label: 'Home', href: '/' },
            { label: 'Projects', href: '/p' },
            { label: 'Numior' },
          ],
        },
      }),
  },
  {
    name: 'NuiToaster',
    render: () => renderToString(NuiToaster, { props: { label: 'Notifications' } }),
  },
  {
    name: 'NuiAlert',
    render: () =>
      renderToString(NuiAlert, { props: { tone: 'error', title: 'Failed', dismissible: true } }),
  },
  {
    name: 'NuiProgress determinate',
    render: () => renderToString(NuiProgress, { props: { value: 40, label: 'Upload' } }),
  },
  {
    name: 'NuiProgress indeterminate',
    render: () => renderToString(NuiProgress, { props: { label: 'Loading' } }),
  },
  { name: 'NuiSkeleton', render: () => renderToString(NuiSkeleton, { props: { lines: 2 } }) },
  {
    name: 'NuiToast',
    render: () =>
      renderToString(NuiToast, {
        props: {
          toast: {
            id: 'saved',
            title: 'Failed',
            description: undefined,
            tone: 'error',
            duration: 0,
            action: undefined,
            dismissible: true,
            leaving: false,
          },
        },
      }),
  },
  { name: 'NuiTooltip', render: () => renderToString(TooltipScene) },
];

const LATE_EVENING_UTC = '2026-10-31T22:30:00Z';

const renderBareCalendar = (): Promise<string> =>
  renderToString(NuiCalendar, { props: { locale: 'en-US' } });

describe('server rendering', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name} renders deterministic markup without a DOM`, async () => {
      const first = await scenario.render();
      expect(first).toBe(await scenario.render());
      expect(first).not.toContain('undefined');
      expect(first).not.toMatch(/aria-describedby=""|id=""/);
    });
  }

  it('wires field ids and values on the server so hydration needs no fixups', async () => {
    const html = await fieldWithInput();
    const controlId = labelTarget(html);
    expect(controlId).toBeTruthy();
    expect(html).toContain(`id="${controlId}"`);
    expect(html).toContain(`aria-describedby="${controlId}-description ${controlId}-error"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('value="a"');
  });

  it('renders the room kept for an error as a hidden line on the server', async () => {
    const html = await renderToString(FieldScene, { props: { scene: 'reserved-error' } });

    expect(html).toContain('nui-field--reserve-error');
    expect(html).toContain('<span class="nui-field__reserve" aria-hidden="true"></span>');
    expect(html).not.toContain('aria-describedby');
  });

  it('renders dialogs closed with their labels resolved on the server', async () => {
    const html = await renderToString(NuiDialog, {
      props: { open: true, id: 'confirm', title: 'Delete?' },
      slots: { default: 'Body' },
    });

    expect(html).toMatch(/<dialog[^>]*id="confirm"/);
    expect(html).not.toMatch(/<dialog[^>]* open/);
    expect(html).toContain('aria-labelledby="confirm-title"');
    expect(html).toContain('id="confirm-title"');
  });

  it('renders built-in texts in the configured language and with overrides', async () => {
    const russian = await renderToString(NuiDialog, {
      global: { plugins: configPlugins({ locale: 'ru-RU' }) },
    });

    const overridden = await renderToString(NuiDialog, {
      global: {
        plugins: configPlugins({
          locale: 'ru-RU',
          messages: { ru: { dialog: { close: 'Скрыть' } } },
        }),
      },
    });

    expect(russian).toContain('aria-label="Закрыть"');
    expect(overridden).toContain('aria-label="Скрыть"');
  });

  it('renders a stepper as a labelled list with the current step and localized numbers', async () => {
    const html = await renderToString(NuiStepper, {
      props: { steps: STEPPER_STEPS, modelValue: 'plan' },
      global: { plugins: configPlugins({ locale: 'ar-EG' }) },
    });

    expect(html).toContain(
      '<nav class="nui-stepper nui-stepper--orientation-horizontal" aria-label="Steps">',
    );

    expect(html).toContain('<ol class="nui-stepper__list" role="list">');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('٣');
  });

  it('links popover triggers and content by id on the server and keeps them hidden', async () => {
    const html = await renderPopover();
    const id = popoverTarget(html);
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-expanded="true"');

    const tooltip = await renderToString(TooltipScene);
    expect(tooltip).toContain('aria-describedby="hint"');
    expect(tooltip).toContain('role="tooltip"');
    expect(tooltip).toContain('popover="manual"');
  });

  it('renders a menu with its parts closed and without a live tab stop', async () => {
    const html = await renderMenu();
    expect(html).toContain('role="menu"');
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-labelledby="actions-trigger"');
    expect(html).toContain('role="menuitemcheckbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('tabindex="0"');
  });

  it('renders a button with to through the configured link and as an anchor without one', async () => {
    const configured = await renderToString(NuiButton, {
      props: { to: '/guide' },
      slots: { default: 'Guide' },
      global: { plugins: configPlugins({ link: RouterStub }) },
    });

    expect(configured).toContain('href="/router/guide"');
    expect(configured).not.toContain(' to=');

    const plain = await renderToString(NuiButton, {
      props: { to: '/guide' },
      slots: { default: 'Guide' },
    });

    expect(plain).toContain('<a');
    expect(plain).toContain('href="/guide"');
    expect(plain).not.toContain(' to=');
  });

  it('renders tabs with one selected tab stop and hidden inactive panels', async () => {
    const html = await renderTabs();
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(3);
    expect(html).toContain('id="settings-tab-team"');
    expect(html).toContain('aria-labelledby="settings-tab-team"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('display:none');
  });

  it('renders the close button of a closable tab beside it, hidden from assistive technology', async () => {
    const html = await renderToString(NuiTabs, {
      props: {
        id: 'files',
        modelValue: 'contract',
        tabs: [
          { value: 'contract', label: 'Contract', closable: true },
          { value: 'invoice', label: 'Invoice' },
        ],
      },
    });

    const close = /<button[^>]*class="[^"]*nui-tab__close[^"]*"[^>]*>/.exec(html)?.[0] ?? '';

    expect(html.match(/nui-tab--closable/g)).toHaveLength(1);
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(close).toContain('nui-button--variant-plain');
    expect(close).toContain('nui-button--size-inline');
    expect(close).toContain('tabindex="-1"');
    expect(close).toContain('aria-hidden="true"');
    expect(html.match(/<button[^>]*nui-tab__close/g)).toHaveLength(1);
    expect(html.match(/<span[^>]*nui-tab-list__edge[^>]*aria-hidden="true"/g)).toHaveLength(2);
    expect(html).not.toContain('nui-tab-list__edge--shown');
  });

  it('renders link tabs as a labelled nav of links with the current page marked', async () => {
    const html = await renderToString(NuiTabs, {
      props: {
        label: 'Sections',
        modelValue: '/orders',
        links: [
          { to: '/overview', label: 'Overview' },
          { to: '/orders', label: 'Orders' },
        ],
      },
    });

    expect(html).toMatch(/^<nav[^>]*aria-label="Sections"/);
    expect(html).toContain('href="/overview"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain('role="tab');
  });

  it('renders breadcrumbs as a labelled nav with the current page marked', async () => {
    const html = await renderToString(NuiBreadcrumbs, {
      props: {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/p' },
          { label: 'Numior' },
        ],
        maxItems: 2,
      },
    });

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('href="/p"');
  });

  it('renders a select as a closed combobox with its value in a hidden input', async () => {
    const html = await renderSelect();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('type="hidden" name="fruit" value="banana"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('class="nui-select__value"');
    expect(html).toContain('Banana');
    expect(await renderReadonlySelect()).toContain('aria-readonly="true"');
  });

  it('renders a calendar grid with one tab stop and a deterministic today marker', async () => {
    const html = await renderToString(NuiCalendar, {
      props: { modelValue: '2026-09-24', locale: 'ru-RU', today: '2026-09-24' },
    });

    expect(html).toContain('role="grid"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('datetime="2026-09-24"');
    expect(html).toContain('сентябрь');
    expect(html).not.toContain('nui-calendar__picker');

    const bare = await renderToString(NuiCalendar, {
      props: { month: '2026-09', locale: 'en-US' },
    });

    expect(bare).not.toContain('aria-current');
    expect(bare).toContain('September');
  });

  it('renders the same calendar in every time zone when neither a date nor today is given', async () => {
    const west = await atInstant(LATE_EVENING_UTC, 'Pacific/Honolulu', renderBareCalendar);
    const east = await atInstant(LATE_EVENING_UTC, 'Asia/Tokyo', renderBareCalendar);

    expect(east).toBe(west);
    expect(west).toContain('October');
  });

  it('renders a date picker closed with localised text and a hidden ISO value', async () => {
    const html = await renderToString(NuiDatePicker, {
      props: { modelValue: '2026-09-24', locale: 'ru-RU', name: 'trip' },
    });

    expect(html).toContain('value="24.09.2026"');
    expect(html).toContain('popover="manual"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('name="trip"');
    expect(html).toContain('value="2026-09-24"');
    expect(html).toContain('aria-label="Выбрать дату"');
    expect(html).toContain('placeholder="ДД.ММ.ГГГГ"');
  });

  it('renders a number field formatted on the server with spinbutton semantics', async () => {
    const html = await renderToString(NuiNumberField, {
      props: {
        modelValue: 1234.5,
        locale: 'de-DE',
        formatOptions: { style: 'currency', currency: 'EUR' },
        name: 'price',
        min: 0,
      },
    });

    expect(html).toContain('role="spinbutton"');
    expect(html).toMatch(/value="1\.234,50\s€"/);
    expect(html).toContain('aria-valuenow="1234.5"');
    expect(html).toContain('type="hidden" name="price" value="1234.5"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it('renders the app shell with an expanded sidebar and no drawer on the server', async () => {
    const html = await renderToString(LayoutScene, { props: { variant: 'inset' } });

    expect(html).toContain('<aside');
    expect(html).toContain('nui-sidebar--variant-inset');
    expect(html).toContain('aria-label="Sections"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="shell-sidebar"');
    expect(html).toContain('id="shell-sidebar"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="#docs"');
    expect(html).not.toContain('nui-sidebar--rail');
    expect(html).not.toContain('<dialog');
  });

  it('renders an upload zone with a labelled button and existing files without previews', async () => {
    const html = await renderToString(NuiUpload<string>, {
      props: {
        upload: () => Promise.resolve('ok'),
        id: 'attachments',
        hint: 'PDF up to 1 MB',
        modelValue: [REPORT],
      },
    });

    expect(html).toContain('type="file"');
    expect(html).toContain('id="attachments"');
    expect(html).toContain('Choose files');
    expect(html).toContain('PDF up to 1 MB');
    expect(html).toContain('nui-upload-item--status-done');
    expect(html).toContain('report.pdf');
    expect(html).toContain('2 kB');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<progress');

    const avatar = await renderToString(NuiAvatarUpload<string>, {
      props: {
        upload: () => Promise.resolve('ok'),
        name: 'Ann Smith',
        label: 'Photo',
      },
    });

    expect(avatar).toContain('aria-label="Choose an image"');
    expect(avatar).toContain('AS');
    expect(avatar).not.toContain('<img');
  });

  it('renders a time field with one tab stop, filled segments and a closed list', async () => {
    const html = await renderToString(NuiTimeField, {
      props: { modelValue: '13:05', locale: 'en-US', name: 'start' },
    });

    expect(html).toContain('role="group"');
    expect(html.match(/role="spinbutton"/g)).toHaveLength(3);
    expect(html).toContain('value="01"');
    expect(html).toContain('value="05"');
    expect(html).toContain('value="PM"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('type="hidden" name="start" value="13:05"');
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-activedescendant');

    const german = await renderToString(NuiTimeField, {
      props: { modelValue: '13:05', locale: 'de-DE' },
    });

    expect(german).toContain('value="13"');
    expect(german.match(/role="spinbutton"/g)).toHaveLength(2);
  });

  it('renders a one-time code field with its value on the labelled input and hidden slots', async () => {
    const html = await renderToString(FieldScene, { props: { scene: 'otp' } });
    const controlId = labelTarget(html);
    expect(controlId).toBeTruthy();
    expect(html).toContain(`id="${controlId}"`);
    expect(html).toContain('autocomplete="one-time-code"');
    expect(html).toContain('name="code"');
    expect(html).toContain('value="48"');
    expect(html).toContain('class="nui-otp-field__slots" aria-hidden="true"');
    expect(html.match(/class="nui-otp-field__slot"/g)).toHaveLength(6);
    expect(html.match(/nui-otp-field__placeholder/g)).toHaveLength(4);
    expect(html).not.toContain('nui-otp-field__caret');
  });

  it('renders a combobox input with its selected label and no active descendant', async () => {
    const html = await renderCombobox();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('popover="manual"');
    expect(html).toContain('value="Banana"');
    expect(html).toContain('type="hidden" name="fruit" value="banana"');
    expect(html).not.toContain('aria-activedescendant');
  });

  it('renders pagination links with the current page marked', async () => {
    const html = await renderToString(NuiPagination, {
      props: { total: 60, page: 2, href: (page: number) => `#page-${page}` },
    });

    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="#page-3"');
    expect(html).toContain('21–40 of 60');
  });

  it('renders the toaster as an empty manual live region', async () => {
    const html = await renderToString(NuiToaster, { props: { label: 'Notifications' } });
    expect(html).toContain('popover="manual"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('nui-toast ');
  });

  it('renders feedback components with their native semantics on the server', async () => {
    const alert = await renderToString(NuiAlert, { props: { tone: 'error', title: 'Failed' } });
    expect(alert).toContain('role="alert"');

    const determinate = await renderToString(NuiProgress, { props: { value: 40 } });
    expect(determinate).toContain('value="40"');

    const indeterminate = await renderToString(NuiProgress);
    expect(indeterminate).not.toContain('value=');

    const skeleton = await renderToString(NuiSkeleton);
    expect(skeleton).toContain('aria-hidden="true"');
  });

  it('renders badge counts and dot labels on the server', async () => {
    const count = await renderToString(NuiBadge, { props: { count: 120, tone: 'error' } });
    expect(count).toContain('99+');

    const dot = await renderToString(NuiBadge, { props: { dot: true, label: 'Online' } });
    expect(dot).toContain('role="img"');
    expect(dot).toContain('aria-label="Online"');
  });

  it('renders avatars with their image, initials or icon and groups with the overflow count', async () => {
    const image = await renderToString(NuiAvatar, {
      props: { src: '/alice.png', name: 'Alice Brown' },
    });

    expect(image).toContain('<img');
    expect(image).toContain('alt="Alice Brown"');
    expect(image).not.toContain('nui-avatar__initials');
    expect(await renderToString(NuiAvatar, { props: { name: 'Alice Brown' } })).toContain('AB');
    expect(await renderToString(NuiAvatar)).toContain('lucide-user');

    const items = await renderToString(NuiAvatarGroup, {
      props: { items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Cara' }], max: 1 },
    });

    expect(items).toContain('+2');

    const slotted = await renderToString(AvatarGroupScene);
    expect(slotted).toContain('+2');
    expect(slotted.match(/nui-avatar--size-lg/g)).toHaveLength(2);
  });

  it('renders the empty state with its icon and inside an empty listbox', async () => {
    const empty = await renderToString(NuiEmpty, { props: { title: 'Nothing here' } });
    expect(empty).toContain('lucide-inbox');
    expect(empty).toContain('Nothing here');

    const select = await renderToString(NuiSelect, {
      props: { options: [], emptyLabel: 'No options' },
    });

    expect(select).toContain('nui-list__empty');
    expect(select).toContain('No options');
  });

  it('renders a linked card with its stretched action and a plain card without one', async () => {
    const linked = await renderToString(CardScene);

    expect(linked).toContain('nui-card--interactive');

    expect(linked).toContain(
      'class="nui-link nui-link--tone-neutral nui-link--underline-none nui-card__action"',
    );

    expect(linked).toContain('href="/plans"');
    expect(linked).toContain('<h3');
    expect(linked).toContain('<img');

    const plain = await renderToString(NuiCard, { props: { title: 'Plans' } });
    expect(plain).not.toContain('nui-card__action');
    expect(plain).not.toContain('nui-card--interactive');
  });

  it('renders a selectable list with one selected option and one tab stop', async () => {
    const items = [
      { label: 'Go', value: 'go' },
      { label: 'Rust', value: 'rust' },
    ];

    const html = await renderToString(NuiList, {
      props: { items, selectable: 'single', modelValue: 'rust', label: 'Languages' },
    });

    expect(html).toContain('role="listbox"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Languages"');

    const links = await renderToString(NuiList, {
      props: { items: [{ label: 'Docs', href: '/docs' }] },
    });

    expect(links).toContain('href="/docs"');
    expect(links).not.toContain('role="listbox"');

    const empty = await renderToString(NuiList, { props: { items: [], emptyLabel: 'Nothing' } });
    expect(empty).toContain('nui-empty');
    expect(empty).toContain('Nothing');
  });

  it('renders a tree flat with levels and one selected node and windows long trees', async () => {
    const html = await renderToString(NuiTree, {
      props: { id: 'files', items: FILES, expanded: ['src'], modelValue: 'index' },
    });

    expect(html).toContain('role="tree"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('<ul class="nui-list__items nui-tree__list" role="presentation"');
    expect(html).toContain('<li id="files-node-src" class="nui-list-item');
    expect(html).toContain('nui-list-item--mode-treeitem');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('id="files-node-src"');
    expect(html).toContain('aria-expanded="true"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).not.toContain('aria-activedescendant');

    const windowed = await renderToString(NuiTree, {
      props: { items: manyNodes(500), virtual: true, height: '10rem' },
    });

    expect(windowed.match(/role="treeitem"/g)).toHaveLength(20);
    expect(windowed).toContain('--_window-lead:0px');
    expect(windowed).toContain('--_window-rest:17280px');
    expect(windowed).toContain('--_window-clamp-start:-720px');
  });

  it('renders a splitter ratio outside its bounds clamped on the server', async () => {
    const html = await renderToString(NuiSplitter, {
      props: { id: 'panes', ratio: 0.95, min: 0.2, max: 0.8 },
    });

    expect(html).toContain('--_ratio:0.8');
    expect(html).toContain('aria-valuenow="80"');
  });

  it('renders a select with nested options as a tree on the server', async () => {
    const html = await renderToString(NuiSelect, {
      props: { options: CATEGORIES, modelValue: 'laptops', label: 'Category' },
    });

    expect(html).toContain('aria-haspopup="tree"');
    expect(html).toContain('role="tree"');
    expect(html).toContain('Laptops');
  });

  it('renders lazy default icons on the server', async () => {
    const html = await renderToString(NuiIcon, { props: { icon: 'check' } });
    expect(html).toContain('lucide-check');
  });

  it('renders the own field texts of a control with matching ids on the server', async () => {
    const markup = await renderToString(NuiInput, {
      props: { modelValue: '', label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    const id = labelTarget(markup);

    expect(id).toBeTruthy();
    expect(markup).toContain(`<input`);
    expect(markup).toContain(`id="${id}"`);
    expect(markup).toContain(`aria-describedby="${id}-description ${id}-error"`);
    expect(markup).toContain('nui-field--invalid');
  });

  it('disables the hidden inputs of disabled controls so native forms skip their values', async () => {
    const html = await renderToString(DisabledControlsForm);
    expect(html.match(/type="hidden"[^>]*disabled/g)).toHaveLength(3);
  });
});
