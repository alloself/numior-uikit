// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { h, type VNode } from 'vue';
import {
  NuiAlert,
  NuiBreadcrumbs,
  NuiButton,
  NuiCheckbox,
  NuiConfigProvider,
  NuiDialog,
  NuiDrawer,
  NuiField,
  NuiIcon,
  NuiInput,
  NuiLink,
  NuiMenu,
  NuiPopover,
  NuiProgress,
  NuiRadio,
  NuiSkeleton,
  NuiRadioGroup,
  NuiSelect,
  NuiSwitch,
  NuiTabs,
  NuiTextarea,
  NuiToast,
  NuiToaster,
  NuiTooltip,
  type NuiMenuEntry,
  type NuiMenuTriggerSlot,
  type NuiPopoverTriggerSlot,
  type NuiTabsPanelSlot,
  type NuiTooltipTriggerSlot,
} from '../src';
import { labelTarget, popoverTarget, renderMarkup } from './support/ssr';

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
  { name: 'NuiIcon', render: () => h(NuiIcon, { alias: 'check' }) },
  {
    name: 'NuiLink',
    render: () => h(NuiLink, { href: 'https://example.com', external: true }, () => 'Docs'),
  },
  { name: 'NuiConfigProvider', render: () => h(NuiConfigProvider, null, () => 'content') },
  { name: 'NuiField with NuiInput', render: fieldWithInput },
  { name: 'NuiTextarea', render: () => h(NuiTextarea, { modelValue: 'text', invalid: true }) },
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

  it('renders dialogs closed with their labels resolved on the server', async () => {
    const html = await renderMarkup(() =>
      h(NuiDialog, { open: true, id: 'confirm', title: 'Delete?' }, () => 'Body'),
    );
    expect(html).toMatch(/<dialog[^>]*id="confirm"/);
    expect(html).not.toMatch(/<dialog[^>]* open/);
    expect(html).toContain('aria-labelledby="confirm-title"');
    expect(html).toContain('id="confirm-title"');
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

  it('renders lazy default icons on the server', async () => {
    const html = await renderMarkup(() => h(NuiIcon, { alias: 'check' }));
    expect(html).toContain('lucide-check');
  });
});
