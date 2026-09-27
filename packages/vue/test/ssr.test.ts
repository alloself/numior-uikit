// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { h, type VNode } from 'vue';
import {
  NuiAlert,
  NuiAvatar,
  NuiAvatarGroup,
  NuiBadge,
  NuiBreadcrumbs,
  NuiButton,
  NuiCalendar,
  NuiCard,
  NuiCardContent,
  NuiCardMedia,
  NuiCheckbox,
  NuiChip,
  NuiCombobox,
  NuiDatePicker,
  NuiDateRangePicker,
  NuiDialog,
  NuiDrawer,
  NuiEmpty,
  NuiField,
  NuiIcon,
  NuiInput,
  NuiLink,
  NuiList,
  NuiPagination,
  NuiMenu,
  NuiNumberField,
  NuiPopover,
  NuiProgress,
  NuiRadio,
  NuiSkeleton,
  NuiStepper,
  NuiRadioGroup,
  NuiSelect,
  NuiSeparator,
  NuiKbd,
  NuiCode,
  NuiToggleGroup,
  NuiSwitch,
  NuiTable,
  NuiTabs,
  NuiTextarea,
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
  NuiTimeField,
  NuiToast,
  NuiUpload,
  NuiToaster,
  NuiTooltip,
  NuiTree,
  type NuiMenuEntry,
  type NuiMenuTriggerSlot,
  type NuiPopoverTriggerSlot,
  type NuiTabsPanelSlot,
  type NuiTooltipTriggerSlot,
} from '../src';
import { configScope } from './support/config-scope';
import { labelTarget, popoverTarget, renderMarkup } from './support/ssr';
import { childrenOf, COLUMNS, manyPeople, PEOPLE, TEAM } from './support/rows';
import { FILES, manyNodes } from './support/tree-items';

const STEPPER_STEPS = [
  { value: 'account', label: 'Account' },
  { value: 'profile', label: 'Profile', description: 'Name and photo' },
  { value: 'plan', label: 'Plan' },
];

interface Scenario {
  readonly name: string;
  render(): VNode;
}

const fieldWithInput = () =>
  h(NuiField, { label: 'Email', description: 'Work', error: 'Required' }, () =>
    h(NuiInput, { modelValue: 'a', placeholder: 'name@example.com' }),
  );

const menuEntries: NuiMenuEntry[] = [
  { label: 'Copy', shortcut: '⌘C' },
  { type: 'separator' },
  { type: 'checkbox', label: 'Grid', checked: true, onCheckedChange: () => undefined },
  { type: 'sub', label: 'Export', items: [{ label: 'PDF' }] },
];

const renderMenu = () =>
  h(
    NuiMenu,
    { id: 'actions', items: menuEntries },
    { trigger: (slot: NuiMenuTriggerSlot) => h('button', slot.attrs, 'Actions') },
  );

const renderTabs = () =>
  h(
    NuiTabs,
    {
      id: 'settings',
      modelValue: 'team',
      tabs: [
        { value: 'general', label: 'General' },
        { value: 'team', label: 'Team' },
      ],
    },
    { panel: (slot: NuiTabsPanelSlot) => `${slot.tab.label} panel` },
  );

const renderSelect = () =>
  h(NuiField, { label: 'Fruit' }, () =>
    h(NuiSelect, {
      modelValue: 'banana',
      name: 'fruit',
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
      ],
    }),
  );

const renderCombobox = () =>
  h(NuiField, { label: 'Fruit' }, () =>
    h(NuiCombobox, {
      modelValue: 'banana',
      name: 'fruit',
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
      ],
    }),
  );

const renderPopover = () =>
  h(
    NuiPopover,
    { open: true },
    {
      trigger: (slot: NuiPopoverTriggerSlot) => h('button', slot.attrs, 'Open'),
      default: () => 'Content',
    },
  );

const scenarios: Scenario[] = [
  { name: 'NuiButton', render: () => h(NuiButton, { loading: true }, () => 'Save') },
  {
    name: 'NuiButton as link',
    render: () => h(NuiButton, { href: '/docs', variant: 'outline' }, () => 'Docs'),
  },
  { name: 'NuiIcon', render: () => h(NuiIcon, { alias: 'check' }) },
  { name: 'NuiSeparator', render: () => h(NuiSeparator, { label: 'or' }) },
  { name: 'NuiKbd', render: () => h(NuiKbd, { keys: 'mod+k' }) },
  {
    name: 'NuiToggleGroup',
    render: () =>
      h(NuiToggleGroup, {
        modelValue: 'dark',
        label: 'Theme',
        variant: 'segmented',
        items: [
          { value: 'light', label: 'Light', icon: 'sun' },
          { value: 'dark', label: 'Dark', icon: 'moon' },
        ],
      }),
  },
  {
    name: 'NuiCode',
    render: () =>
      h(NuiCode, {
        code: 'const a = 1;\nconst b = 2;\n',
        title: 'main.ts',
        lineNumbers: true,
        highlight: [2],
        tokens: [
          [{ text: 'const', scope: 'keyword' }, { text: ' a = ' }, { text: '1', scope: 'number' }],
          [{ text: 'const', scope: 'keyword' }, { text: ' b = ' }, { text: '2', scope: 'number' }],
        ],
      }),
  },
  {
    name: 'NuiChip',
    render: () =>
      h(NuiChip, { tone: 'success', removable: true, removeLabel: 'Remove Vue' }, () => 'Vue'),
  },
  { name: 'NuiBadge', render: () => h(NuiBadge, { count: 120, tone: 'error' }) },
  {
    name: 'NuiEmpty',
    render: () => h(NuiEmpty, { title: 'Nothing here', description: 'Add an item' }),
  },
  {
    name: 'NuiList',
    render: () =>
      h(NuiList, {
        items: [
          { label: 'Docs', href: '/docs', description: 'Guides' },
          { label: 'Plain', icon: 'check' },
        ],
        variant: 'divided',
      }),
  },
  {
    name: 'NuiList nav',
    render: () =>
      h(NuiList, {
        items: [
          { label: 'Inbox', href: '/inbox', icon: 'inbox', current: true, badge: 3 },
          { label: 'Drafts', href: '/drafts' },
        ],
        variant: 'nav',
      }),
  },
  {
    name: 'NuiTree',
    render: () => h(NuiTree, { id: 'files', items: FILES, expanded: ['src'], modelValue: 'index' }),
  },
  {
    name: 'NuiTable',
    render: () =>
      h(NuiTable, {
        columns: COLUMNS,
        rows: PEOPLE,
        selectable: 'multiple',
        sort: { key: 'name', direction: 'asc' },
        pagination: true,
        pageSize: 5,
        caption: 'Команда',
      }),
  },
  {
    name: 'NuiCard',
    render: () =>
      h(NuiCard, { href: '/plans', title: 'Plans', description: 'Pick one' }, () => [
        h(NuiCardMedia, { src: '/cover.png', alt: 'Cover' }),
        h(NuiCardContent, null, () => 'Body'),
      ]),
  },
  {
    name: 'NuiAvatar',
    render: () => h(NuiAvatar, { src: '/alice.png', name: 'Alice Brown', status: 'online' }),
  },
  {
    name: 'NuiAvatarGroup',
    render: () =>
      h(NuiAvatarGroup, { items: [{ name: 'Alice Brown' }, { name: 'Bob Stone' }], max: 1 }),
  },
  {
    name: 'NuiLink',
    render: () => h(NuiLink, { href: 'https://example.com', external: true }, () => 'Docs'),
  },
  {
    name: 'NuiStepper',
    render: () => h(NuiStepper, { steps: STEPPER_STEPS, modelValue: 'profile' }),
  },
  {
    name: 'NuiDialog in a Russian config',
    render: () =>
      h(configScope({ locale: 'ru-RU' }, () => h(NuiDialog, { title: 'Удалить?' }, () => 'Текст'))),
  },
  {
    name: 'provideNuiConfig scope',
    render: () =>
      h(configScope({ locale: 'de-DE' }, () => h(NuiNumberField, { modelValue: 1234.5 }))),
  },
  { name: 'NuiField with NuiInput', render: fieldWithInput },
  {
    name: 'NuiField keeping room for an error',
    render: () => h(NuiField, { label: 'Email', reserveError: true }, () => h(NuiInput)),
  },
  { name: 'NuiTextarea', render: () => h(NuiTextarea, { modelValue: 'text', invalid: true }) },
  {
    name: 'NuiTimeField',
    render: () => h(NuiTimeField, { modelValue: '13:05', locale: 'en-US', name: 'start' }),
  },
  {
    name: 'NuiDatePicker',
    render: () =>
      h(NuiDatePicker, {
        modelValue: '2026-09-24',
        locale: 'ru-RU',
        name: 'trip',
        today: '2026-09-24',
      }),
  },
  {
    name: 'NuiDateRangePicker',
    render: () =>
      h(NuiDateRangePicker, {
        modelValue: { start: '2026-09-21', end: '2026-09-27' },
        locale: 'en-US',
        startName: 'from',
        endName: 'to',
        today: '2026-09-24',
      }),
  },
  {
    name: 'NuiUpload',
    render: () =>
      h(NuiUpload<string>, {
        upload: () => Promise.resolve('ok'),
        hint: 'PDF up to 1 MB',
        modelValue: [
          {
            id: 'existing-1',
            name: 'report.pdf',
            size: 2048,
            type: 'application/pdf',
            status: 'done',
            url: 'https://cdn.example/report.pdf',
          },
        ],
      }),
  },
  {
    name: 'NuiLayout',
    render: () =>
      h(
        NuiLayout,
        { id: 'shell', contentAs: 'div' },
        {
          sidebar: () =>
            h(NuiSidebar, { collapsible: 'icon', label: 'Sections' }, () =>
              h(NuiSidebarContent, () =>
                h(NuiSidebarGroup, { label: 'Overview' }, () => [
                  h(NuiSidebarItem, { label: 'Inbox', icon: 'inbox', current: true }),
                  h(NuiSidebarItem, { label: 'Docs', href: '#docs' }),
                ]),
              ),
            ),
          header: () =>
            h(NuiAppBar, null, { start: () => h(NuiSidebarTrigger), default: () => 'Inbox' }),
          default: () => h('p', 'Content'),
        },
      ),
  },
  {
    name: 'NuiDatePicker with time',
    render: () =>
      h(NuiDatePicker, {
        modelValue: '2026-09-24T09:30',
        locale: 'ru-RU',
        time: true,
        today: '2026-09-24',
      }),
  },
  {
    name: 'NuiCalendar',
    render: () =>
      h(NuiCalendar, {
        modelValue: { start: '2026-09-21', end: '2026-09-25' },
        mode: 'range',
        month: '2026-09',
        locale: 'ru-RU',
        today: '2026-09-24',
        weekNumbers: true,
        months: 2,
      }),
  },
  {
    name: 'NuiNumberField',
    render: () =>
      h(NuiNumberField, {
        modelValue: 1234.5,
        locale: 'de-DE',
        formatOptions: { style: 'currency', currency: 'EUR' },
        name: 'price',
        min: 0,
      }),
  },
  {
    name: 'NuiCheckbox',
    render: () => h(NuiCheckbox, { modelValue: true, indeterminate: true }, () => 'Terms'),
  },
  {
    name: 'NuiRadioGroup in a group field',
    render: () =>
      h(NuiField, { label: 'Plan', group: true }, () =>
        h(NuiRadioGroup, { modelValue: 'a' }, () => [
          h(NuiRadio, { value: 'a' }, () => 'A'),
          h(NuiRadio, { value: 'b' }, () => 'B'),
        ]),
      ),
  },
  { name: 'NuiSwitch', render: () => h(NuiSwitch, { modelValue: true }, () => 'Notify') },
  {
    name: 'NuiDialog',
    render: () =>
      h(
        NuiDialog,
        { open: true, id: 'confirm', title: 'Delete?', description: 'Sure?' },
        () => 'Body',
      ),
  },
  { name: 'NuiDrawer', render: () => h(NuiDrawer, { open: true, side: 'start' }, () => 'Body') },
  { name: 'NuiPopover', render: renderPopover },
  { name: 'NuiMenu', render: renderMenu },
  { name: 'NuiTabs', render: renderTabs },
  { name: 'NuiSelect in a field', render: renderSelect },
  { name: 'NuiCombobox in a field', render: renderCombobox },
  {
    name: 'NuiPagination',
    render: () => h(NuiPagination, { total: 60, page: 2, href: (page: number) => `#page-${page}` }),
  },
  {
    name: 'NuiBreadcrumbs',
    render: () =>
      h(NuiBreadcrumbs, {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/p' },
          { label: 'Numior' },
        ],
      }),
  },
  { name: 'NuiToaster', render: () => h(NuiToaster, { label: 'Notifications' }) },
  {
    name: 'NuiAlert',
    render: () => h(NuiAlert, { tone: 'error', title: 'Failed', dismissible: true }),
  },
  { name: 'NuiProgress determinate', render: () => h(NuiProgress, { value: 40, label: 'Upload' }) },
  { name: 'NuiProgress indeterminate', render: () => h(NuiProgress, { label: 'Loading' }) },
  { name: 'NuiSkeleton', render: () => h(NuiSkeleton, { lines: 2 }) },
  {
    name: 'NuiToast',
    render: () =>
      h(NuiToast, {
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
      }),
  },
  {
    name: 'NuiTooltip',
    render: () =>
      h(
        NuiTooltip,
        { id: 'hint' },
        {
          trigger: (slot: NuiTooltipTriggerSlot) => h('button', slot.attrs, 'Save'),
          default: () => 'Saves the document',
        },
      ),
  },
];

describe('server rendering', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name} renders deterministic markup without a DOM`, async () => {
      const first = await renderMarkup(scenario.render);
      expect(first).toBe(await renderMarkup(scenario.render));
      expect(first).not.toContain('undefined');
      expect(first).not.toMatch(/aria-describedby=""|id=""/);
    });
  }

  it('wires field ids and values on the server so hydration needs no fixups', async () => {
    const html = await renderMarkup(fieldWithInput);
    const controlId = labelTarget(html);
    expect(controlId).toBeTruthy();
    expect(html).toContain(`id="${controlId}"`);
    expect(html).toContain(`aria-describedby="${controlId}-description ${controlId}-error"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('value="a"');
  });

  it('renders the room kept for an error as a hidden line on the server', async () => {
    const html = await renderMarkup(() =>
      h(NuiField, { label: 'Email', reserveError: true }, () => h(NuiInput)),
    );

    expect(html).toContain('nui-field--reserve-error');
    expect(html).toContain('<span class="nui-field__reserve" aria-hidden="true"></span>');
    expect(html).not.toContain('aria-describedby');
  });

  it('renders dialogs closed with their labels resolved on the server', async () => {
    const html = await renderMarkup(() =>
      h(NuiDialog, { open: true, id: 'confirm', title: 'Delete?' }, () => 'Body'),
    );

    expect(html).toMatch(/<dialog[^>]*id="confirm"/);
    expect(html).not.toMatch(/<dialog[^>]* open/);
    expect(html).toContain('aria-labelledby="confirm-title"');
    expect(html).toContain('id="confirm-title"');
  });

  it('renders built-in texts in the configured language and with overrides', async () => {
    const russian = await renderMarkup(() =>
      h(configScope({ locale: 'ru-RU' }, () => h(NuiDialog))),
    );

    const overridden = await renderMarkup(() =>
      h(
        configScope({ locale: 'ru-RU', messages: { ru: { dialog: { close: 'Скрыть' } } } }, () =>
          h(NuiDialog),
        ),
      ),
    );

    expect(russian).toContain('aria-label="Закрыть"');
    expect(overridden).toContain('aria-label="Скрыть"');
  });

  it('renders a stepper as a labelled list with the current step and localized numbers', async () => {
    const html = await renderMarkup(() =>
      h(
        configScope({ locale: 'ar-EG' }, () =>
          h(NuiStepper, { steps: STEPPER_STEPS, modelValue: 'plan' }),
        ),
      ),
    );

    expect(html).toContain(
      '<nav class="nui-stepper nui-stepper--orientation-horizontal" aria-label="Steps">',
    );

    expect(html).toContain('<ol class="nui-stepper__list" role="list">');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('٣');
  });

  it('links popover triggers and content by id on the server and keeps them hidden', async () => {
    const html = await renderMarkup(renderPopover);
    const id = popoverTarget(html);
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-expanded="true"');

    const tooltip = await renderMarkup(() =>
      h(
        NuiTooltip,
        { id: 'hint' },
        {
          trigger: (slot: NuiTooltipTriggerSlot) => h('button', slot.attrs, 'Save'),
          default: () => 'Saves the document',
        },
      ),
    );

    expect(tooltip).toContain('aria-describedby="hint"');
    expect(tooltip).toContain('role="tooltip"');
    expect(tooltip).toContain('popover="manual"');
  });

  it('renders a menu with its parts closed and without a live tab stop', async () => {
    const html = await renderMarkup(renderMenu);
    expect(html).toContain('role="menu"');
    expect(html).toContain('popover="auto"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-labelledby="actions-trigger"');
    expect(html).toContain('role="menuitemcheckbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('tabindex="0"');
  });

  it('renders tabs with one selected tab stop and hidden inactive panels', async () => {
    const html = await renderMarkup(renderTabs);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(3);
    expect(html).toContain('id="settings-tab-team"');
    expect(html).toContain('aria-labelledby="settings-tab-team"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('display:none');
  });

  it('renders breadcrumbs as a labelled nav with the current page marked', async () => {
    const html = await renderMarkup(() =>
      h(NuiBreadcrumbs, {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/p' },
          { label: 'Numior' },
        ],
        maxItems: 2,
      }),
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('href="/p"');
  });

  it('renders a select as a closed combobox with its value in a hidden input', async () => {
    const html = await renderMarkup(renderSelect);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('type="hidden" name="fruit" value="banana"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('class="nui-select__value"');
    expect(html).toContain('Banana');
  });

  it('renders a calendar grid with one tab stop and a deterministic today marker', async () => {
    const html = await renderMarkup(() =>
      h(NuiCalendar, { modelValue: '2026-09-24', locale: 'ru-RU', today: '2026-09-24' }),
    );

    expect(html).toContain('role="grid"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('datetime="2026-09-24"');
    expect(html).toContain('сентябрь');
    expect(html).not.toContain('nui-calendar__picker');

    const bare = await renderMarkup(() => h(NuiCalendar, { month: '2026-09', locale: 'en-US' }));

    expect(bare).not.toContain('aria-current');
    expect(bare).toContain('September');
  });

  it('renders a date picker closed with localised text and a hidden ISO value', async () => {
    const html = await renderMarkup(() =>
      h(NuiDatePicker, { modelValue: '2026-09-24', locale: 'ru-RU', name: 'trip' }),
    );

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
    const html = await renderMarkup(() =>
      h(NuiNumberField, {
        modelValue: 1234.5,
        locale: 'de-DE',
        formatOptions: { style: 'currency', currency: 'EUR' },
        name: 'price',
        min: 0,
      }),
    );

    expect(html).toContain('role="spinbutton"');
    expect(html).toMatch(/value="1\.234,50\s€"/);
    expect(html).toContain('aria-valuenow="1234.5"');
    expect(html).toContain('type="hidden" name="price" value="1234.5"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it('renders the app shell with an expanded sidebar and no drawer on the server', async () => {
    const html = await renderMarkup(() =>
      h(
        NuiLayout,
        { id: 'shell', contentAs: 'div' },
        {
          sidebar: () =>
            h(NuiSidebar, { collapsible: 'icon', label: 'Sections' }, () =>
              h(NuiSidebarContent, () =>
                h(NuiSidebarGroup, { label: 'Overview' }, () => [
                  h(NuiSidebarItem, { label: 'Inbox', icon: 'inbox', current: true }),
                  h(NuiSidebarItem, { label: 'Docs', href: '#docs' }),
                ]),
              ),
            ),
          header: () =>
            h(NuiAppBar, null, { start: () => h(NuiSidebarTrigger), default: () => 'Inbox' }),
          default: () => h('p', 'Content'),
        },
      ),
    );

    expect(html).toContain('<aside');
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
    const html = await renderMarkup(() =>
      h(NuiUpload<string>, {
        upload: () => Promise.resolve('ok'),
        id: 'attachments',
        hint: 'PDF up to 1 MB',
        modelValue: [
          {
            id: 'existing-1',
            name: 'report.pdf',
            size: 2048,
            type: 'application/pdf',
            status: 'done',
            url: 'https://cdn.example/report.pdf',
          },
        ],
      }),
    );

    expect(html).toContain('type="file"');
    expect(html).toContain('id="attachments"');
    expect(html).toContain('Choose files');
    expect(html).toContain('PDF up to 1 MB');
    expect(html).toContain('nui-upload-item--status-done');
    expect(html).toContain('report.pdf');
    expect(html).toContain('2 kB');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<progress');
  });

  it('renders a time field with one tab stop, filled segments and a closed list', async () => {
    const html = await renderMarkup(() =>
      h(NuiTimeField, { modelValue: '13:05', locale: 'en-US', name: 'start' }),
    );

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

    const german = await renderMarkup(() =>
      h(NuiTimeField, { modelValue: '13:05', locale: 'de-DE' }),
    );

    expect(german).toContain('value="13"');
    expect(german.match(/role="spinbutton"/g)).toHaveLength(2);
  });

  it('renders a combobox input with its selected label and no active descendant', async () => {
    const html = await renderMarkup(renderCombobox);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('popover="manual"');
    expect(html).toContain('value="Banana"');
    expect(html).toContain('type="hidden" name="fruit" value="banana"');
    expect(html).not.toContain('aria-activedescendant');
  });

  it('renders pagination links with the current page marked', async () => {
    const html = await renderMarkup(() =>
      h(NuiPagination, { total: 60, page: 2, href: (page: number) => `#page-${page}` }),
    );

    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="#page-3"');
    expect(html).toContain('21–40 of 60');
  });

  it('renders the toaster as an empty manual live region', async () => {
    const html = await renderMarkup(() => h(NuiToaster, { label: 'Notifications' }));
    expect(html).toContain('popover="manual"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('nui-toast ');
  });

  it('renders feedback components with their native semantics on the server', async () => {
    const alert = await renderMarkup(() => h(NuiAlert, { tone: 'error', title: 'Failed' }));
    expect(alert).toContain('role="alert"');
    const determinate = await renderMarkup(() => h(NuiProgress, { value: 40 }));
    expect(determinate).toContain('value="40"');
    const indeterminate = await renderMarkup(() => h(NuiProgress, {}));
    expect(indeterminate).not.toContain('value=');
    const skeleton = await renderMarkup(() => h(NuiSkeleton, {}));
    expect(skeleton).toContain('aria-hidden="true"');
  });

  it('renders badge counts and dot labels on the server', async () => {
    const count = await renderMarkup(() => h(NuiBadge, { count: 120, tone: 'error' }));
    expect(count).toContain('99+');
    const dot = await renderMarkup(() => h(NuiBadge, { dot: true, label: 'Online' }));
    expect(dot).toContain('role="img"');
    expect(dot).toContain('aria-label="Online"');
  });

  it('renders avatars with their image, initials or icon and groups with the overflow count', async () => {
    const image = await renderMarkup(() =>
      h(NuiAvatar, { src: '/alice.png', name: 'Alice Brown' }),
    );

    expect(image).toContain('<img');
    expect(image).toContain('alt="Alice Brown"');
    expect(image).not.toContain('nui-avatar__initials');
    expect(await renderMarkup(() => h(NuiAvatar, { name: 'Alice Brown' }))).toContain('AB');
    expect(await renderMarkup(() => h(NuiAvatar, {}))).toContain('lucide-user');

    const items = await renderMarkup(() =>
      h(NuiAvatarGroup, { items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Cara' }], max: 1 }),
    );

    expect(items).toContain('+2');

    const slotted = await renderMarkup(() =>
      h(NuiAvatarGroup, { max: 1, size: 'lg' }, () => [
        h(NuiAvatar, { name: 'Alice' }),
        h(NuiAvatar, { name: 'Bob' }),
        h(NuiAvatar, { name: 'Cara' }),
      ]),
    );

    expect(slotted).toContain('+2');
    expect(slotted.match(/nui-avatar--size-lg/g)).toHaveLength(2);
  });

  it('renders the empty state with its icon and inside an empty listbox', async () => {
    const empty = await renderMarkup(() => h(NuiEmpty, { title: 'Nothing here' }));
    expect(empty).toContain('lucide-inbox');
    expect(empty).toContain('Nothing here');

    const select = await renderMarkup(() =>
      h(NuiSelect, { options: [], emptyLabel: 'No options' }),
    );

    expect(select).toContain('nui-list__empty');
    expect(select).toContain('No options');
  });

  it('renders a linked card with its stretched action and a plain card without one', async () => {
    const linked = await renderMarkup(() =>
      h(NuiCard, { href: '/plans', title: 'Plans', description: 'Pick one' }, () =>
        h(NuiCardMedia, { src: '/cover.png', alt: 'Cover' }),
      ),
    );

    expect(linked).toContain('nui-card--interactive');

    expect(linked).toContain(
      'class="nui-link nui-link--tone-neutral nui-link--underline-none nui-card__action"',
    );

    expect(linked).toContain('href="/plans"');
    expect(linked).toContain('<h3');
    expect(linked).toContain('<img');
    const plain = await renderMarkup(() => h(NuiCard, { title: 'Plans' }));
    expect(plain).not.toContain('nui-card__action');
    expect(plain).not.toContain('nui-card--interactive');
  });

  it('renders a selectable list with one selected option and one tab stop', async () => {
    const items = [
      { label: 'Go', value: 'go' },
      { label: 'Rust', value: 'rust' },
    ];

    const html = await renderMarkup(() =>
      h(NuiList, { items, selectable: 'single', modelValue: 'rust', label: 'Languages' }),
    );

    expect(html).toContain('role="listbox"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Languages"');

    const links = await renderMarkup(() =>
      h(NuiList, { items: [{ label: 'Docs', href: '/docs' }] }),
    );

    expect(links).toContain('href="/docs"');
    expect(links).not.toContain('role="listbox"');
    const empty = await renderMarkup(() => h(NuiList, { items: [], emptyLabel: 'Nothing' }));
    expect(empty).toContain('nui-empty');
    expect(empty).toContain('Nothing');
  });

  it('renders a tree flat with levels and one selected node and windows long trees', async () => {
    const html = await renderMarkup(() =>
      h(NuiTree, { id: 'files', items: FILES, expanded: ['src'], modelValue: 'index' }),
    );

    expect(html).toContain('role="tree"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('id="files-node-src"');
    expect(html).toContain('aria-expanded="true"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).not.toContain('aria-activedescendant');

    const windowed = await renderMarkup(() =>
      h(NuiTree, { items: manyNodes(500), virtual: true, height: '10rem' }),
    );

    expect(windowed.match(/role="treeitem"/g)).toHaveLength(20);
    expect(windowed).toContain('block-size:16000px');
  });

  it('renders a sorted, selectable and paginated table and windows long ones on the server', async () => {
    const html = await renderMarkup(() =>
      h(NuiTable, {
        columns: COLUMNS,
        rows: PEOPLE,
        selectable: 'multiple',
        sort: { key: 'age', direction: 'desc' },
        pagination: true,
        pageSize: 5,
        caption: 'Команда',
      }),
    );

    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('aria-label="Select all rows"');
    expect(html).toContain('aria-label="Select row"');
    expect(html).toContain('aria-label="Pagination"');
    expect(html.indexOf('Жанна')).toBeLessThan(html.indexOf('Мария'));
    expect(html.match(/nui-table__row--selected/g)).toBeNull();

    const windowed = await renderMarkup(() =>
      h(NuiTable, { columns: COLUMNS, rows: manyPeople(1000), virtual: true, height: '10rem' }),
    );

    expect(windowed).toContain('aria-rowcount="1001"');
    expect(windowed).toContain('nui-table__spacer');
    expect(windowed.match(/aria-rowindex=/g)).toHaveLength(20);

    const pinned = await renderMarkup(() =>
      h(NuiTable, {
        columns: [
          {
            key: 'name',
            label: 'Имя',
            sticky: 'start',
            width: 120,
            resizable: true,
            reorderable: true,
          },
          { key: 'age', label: 'Возраст' },
        ],
        rows: PEOPLE.slice(0, 2),
      }),
    );

    expect(pinned).toContain('<colgroup>');
    expect(pinned).toContain('inline-size:120px');
    expect(pinned).toContain('nui-table__cell--sticky-start');
    expect(pinned).toContain('inset-inline-start:var(--_sticky-0, 0px)');
    expect(pinned).toContain('role="separator"');
    expect(pinned).toContain('aria-valuenow="120"');
    expect(pinned).toContain('aria-label="Reorder Имя"');

    const tree = await renderMarkup(() =>
      h(NuiTable, {
        columns: COLUMNS,
        rows: TEAM,
        getChildren: childrenOf,
        expanded: TEAM.slice(0, 1),
        pinnedRows: PEOPLE.slice(5, 6),
        rowDrag: true,
      }),
    );

    expect(tree).toContain('aria-expanded="true"');
    expect(tree).toContain('nui-table__toggle--leaf');
    expect(tree).toContain('--_level:1');
    expect(tree).toContain('nui-table__body--pinned');
    expect(tree).toContain('aria-label="Reorder row"');
    expect(tree.indexOf('Егор')).toBeLessThan(tree.indexOf('Анна'));
  });

  it('renders lazy default icons on the server', async () => {
    const html = await renderMarkup(() => h(NuiIcon, { alias: 'check' }));
    expect(html).toContain('lucide-check');
  });
});
