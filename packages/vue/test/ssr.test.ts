// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { h, type VNode } from 'vue';
import {
  NuiButton,
  NuiCheckbox,
  NuiConfigProvider,
  NuiDialog,
  NuiDrawer,
  NuiField,
  NuiIcon,
  NuiInput,
  NuiRadio,
  NuiRadioGroup,
  NuiSwitch,
  NuiTextarea,
} from '../src';
import { labelTarget, renderMarkup } from './support/ssr';

interface Scenario {
  readonly name: string;
  render(): VNode;
}

const fieldWithInput = () =>
  h(NuiField, { label: 'Email', description: 'Work', error: 'Required' }, () =>
    h(NuiInput, { modelValue: 'a', placeholder: 'name@example.com' }),
  );

const scenarios: Scenario[] = [
  { name: 'NuiButton', render: () => h(NuiButton, { loading: true }, () => 'Save') },
  { name: 'NuiIcon', render: () => h(NuiIcon, { alias: 'check' }) },
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

  it('renders lazy default icons on the server', async () => {
    const html = await renderMarkup(() => h(NuiIcon, { alias: 'check' }));
    expect(html).toContain('lucide-check');
  });
});
